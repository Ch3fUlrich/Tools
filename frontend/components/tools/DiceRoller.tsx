"use client";

import React, { useState, useEffect } from 'react';
import DiceIcon from '../icons/DiceIcon';
// DieSelect removed per UX change: we show a compact die symbol instead of a dropdown
import ModernCheckbox from '@/components/ui/ModernCheckbox';
import Button from '@/components/ui/Button';
import Counter from '@/components/ui/Counter';
import NumberInput from '@/components/ui/NumberInput';
import { rollDice, saveDiceRoll, getDiceHistory } from '../../lib/api/client';
import DiceHistory from './DiceHistory';
import Boxplot from '../charts/Boxplot';
import Histogram from '../charts/Histogram';
import type { DiceResponse, DiceRequest } from '../../lib/types/dice';

const LS_HISTORY_KEY = 'dice_history_local';

function loadLocalHistory(): Array<{ time: string; summary?: { sum?: number }; details?: unknown[] }> {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalHistory(entries: Array<{ time: string; summary?: { sum?: number }; details?: unknown[] }>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch {
    // storage full or unavailable — ignore
  }
}

type PerDie = {
  original: number[];
  final: number;
};

type RollDetail = {
  sum: number;
  average: number;
  perDie: PerDie[];
  used: number[];
};

type DieOption = 'd2'|'d3'|'d4'|'d6'|'d8'|'d10'|'d12'|'d20'|'custom';

type DiceConfig = {
  id: string;
  dieType: DieOption;
  sides: number;
  count: number;
  // per-die local modifiers
  numericModifier?: number;
  advantage?: 'none' | 'adv' | 'dis';
  rerollEnabled?: boolean;
  rerollOperator?: '<'|'>'|'=';
  rerollValue?: number;
  customName?: string;
};

// DIE_FACES was removed — we now display a consistent die emoji in the dropdown labels (e.g. "🎲 D6 (6)").

// Returns "D6" for a unique die type, or "1. D6" / "2. D6" when multiple configs share the same sides
function getDieLabel(rollIndex: number, configs: DiceConfig[]): string {
  const cfgIndex = Math.min(rollIndex, configs.length - 1);
  const sides = configs[cfgIndex]?.sides ?? 6;
  const typeName = `D${sides}`;
  const sameTypeIndexes = configs.map((c, j) => (c.sides === sides ? j : -1)).filter(j => j >= 0);
  if (sameTypeIndexes.length > 1) {
    const rank = sameTypeIndexes.indexOf(cfgIndex) + 1;
    return `${rank}. ${typeName}`;
  }
  return typeName;
}

// Returns customName if set, otherwise getDieLabel
function getDisplayLabel(idx: number, configs: DiceConfig[]): string {
  const cfg = configs[Math.min(idx, configs.length - 1)];
  if (cfg?.customName) return cfg.customName;
  return getDieLabel(idx, configs);
}

// Compute exact probability distribution for numDice×sides using dynamic programming
function computeSumDist(numDice: number, sides: number): Map<number, number> {
  let dist = new Map<number, number>([[0, 1]]);
  for (let d = 0; d < numDice; d++) {
    const next = new Map<number, number>();
    for (const [s, w] of dist) {
      for (let f = 1; f <= sides; f++) {
        const ns = s + f;
        next.set(ns, (next.get(ns) ?? 0) + w);
      }
    }
    dist = next;
  }
  return dist;
}

export const DiceRoller: React.FC = () => {
  const [diceConfigs, setDiceConfigs] = useState<DiceConfig[]>([
    { id: '1', dieType: 'd6', sides: 6, count: 1, numericModifier: 0, advantage: 'none', rerollEnabled: false, rerollOperator: '<', rerollValue: 0 }
  ]);

  const [history, setHistory] = useState<Array<{
    time: string;
    summary?: { sum?: number };
    details?: RollDetail[];
    groupLabels?: string[];
    groupNormProbs?: (number | null)[];
  }>>([]);
  const [lastResult, setLastResult] = useState<DiceResponse | null>(null);
  const [historySource, setHistorySource] = useState<'local' | 'server'>('local');

  const [loading, setLoading] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  // Load history: prefer backend, fall back to localStorage.
  // Wrapped in Promise.resolve().then() so that an unmocked / undefined
  // getDiceHistory (e.g. in tests that only mock rollDice) is caught safely.
  useEffect(() => {
    const local = loadLocalHistory();
    if (local.length > 0) setHistory(local as Array<{ time: string; summary?: { sum?: number }; details?: RollDetail[] }>);

    Promise.resolve()
      .then(() => getDiceHistory())
      .then((entries) => {
        if (entries && entries.length > 0) {
          const mapped = entries.map((e) => ({
            time: new Date(e.created_at).toLocaleTimeString(),
            summary: typeof e.payload === 'object' && e.payload !== null && 'sum' in e.payload
              ? { sum: (e.payload as { sum?: number }).sum }
              : undefined,
            details: undefined,
          }));
          setHistory(mapped);
          setHistorySource('server');
        }
      })
      .catch(() => {
        // Backend unavailable or not mocked — keep localStorage history
      });
  }, []);

const onRoll = async () => {
  if (diceConfigs.length === 0) return;

  try {
    setLoading(true);

    // Make separate API calls for each dice configuration
    const rollPromises = diceConfigs.map(async (config) => {
      const payload = {
        die: {
          type: config.dieType,
          sides: config.dieType === 'custom' ? config.sides : undefined
        },
        count: config.count
        // Add any other required payload fields here if needed by your API
      };

  // Use shared API client helper so tests can mock this call
  return await rollDice(payload as DiceRequest);
    });

    const results = (await Promise.all(rollPromises)) as DiceResponse[];

    // Combine all results into a single response
    let combinedResult: DiceResponse = {
      rolls: results.flatMap(r => r.rolls),
      summary: { totalRollsRequested: results.length }
    };

    // Apply local modifiers: per-config numeric modifiers and reroll rules
    combinedResult = {
      ...combinedResult,
      rolls: combinedResult.rolls.map((roll, _rollIndex) => {
        // clone roll
        const cloned = JSON.parse(JSON.stringify(roll));
        let anyChanged = false;
        cloned.perDie = cloned.perDie.map((d: PerDie, idx: number) => {
          const cfg = diceConfigs[Math.min(idx, diceConfigs.length - 1)];
          const sides = cfg?.sides || 6;

          const originalFinal = d.final;

          // reroll logic: per-config
          if (cfg?.rerollEnabled && Number.isFinite(cfg.rerollValue || NaN)) {
            const rv = cfg.rerollValue as number;
            const cond = (val: number) => {
              if (cfg.rerollOperator === '<') return val < rv;
              if (cfg.rerollOperator === '>') return val > rv;
              if (cfg.rerollOperator === '=') return val === rv;
              return val === rv;
            };

            let finalVal = d.final;
            const maxAttempts = 3;
            let attempts = 0;
            while (cond(finalVal) && attempts < maxAttempts) {
              finalVal = Math.floor(Math.random() * sides) + 1;
              attempts += 1;
            }
            d.final = finalVal;
          }

          // per-config numeric modifier based on advantage/disadvantage setting
          if (cfg && Number.isFinite(cfg.numericModifier || NaN) && cfg.advantage && cfg.advantage !== 'none') {
            const delta = cfg.advantage === 'adv' ? (cfg.numericModifier || 0) : -(cfg.numericModifier || 0);
            d.final = d.final + delta;
          }

          if (d.final !== originalFinal) anyChanged = true;
          return d;
        });

        // only recalc summary values if we modified any final values; otherwise keep API-provided summary
        if (anyChanged) {
          cloned.sum = cloned.perDie.reduce((s: number, pd: PerDie) => s + pd.final, 0);
          cloned.used = cloned.perDie.map((pd: PerDie) => pd.final);
          cloned.average = cloned.perDie.reduce((s: number, pd: PerDie) => s + pd.final, 0) / cloned.perDie.length;
        }
        return cloned;
      })
    };

    // Compute labels and normalized probabilities for history
    const groupLabels = combinedResult.rolls.map((_, i) => getDisplayLabel(i, diceConfigs));
    const groupNormProbs = combinedResult.rolls.map((roll, i) => {
      const cfg = diceConfigs[Math.min(i, diceConfigs.length - 1)];
      if (cfg.count >= 2 && cfg.sides <= 20) {
        const dist = computeSumDist(cfg.count, cfg.sides);
        const maxW = Math.max(...dist.values());
        const w = dist.get(roll.sum) ?? 0;
        return maxW > 0 ? w / maxW : null;
      }
      return null;
    });

    const entry = {
      time: new Date().toLocaleTimeString(),
      summary: { sum: combinedResult.rolls.reduce((total, roll) => total + roll.sum, 0) },
      details: combinedResult.rolls as RollDetail[],
      groupLabels,
      groupNormProbs,
    };
    setHistory(h => {
      const updated = [entry, ...h];
      if (historySource === 'local') saveLocalHistory(updated);
      return updated;
    });
    setLastResult(combinedResult);
    // Best-effort save to backend — fire and forget; never throws to caller.
    Promise.resolve().then(() => saveDiceRoll({ sum: entry.summary.sum, time: entry.time })).catch(() => {});
  } catch(err) {
    /* eslint-disable-next-line no-console */
    console.error('roll error', err);
    alert('Roll failed: '+String(err));
  }
  finally { setLoading(false); }
};


  const addDiceConfigWithType = (dieType: DieOption) => {
    const newId = Date.now().toString();
    const sides = dieType === 'custom' ? 6 : (dieType === 'd2' ? 2 : dieType === 'd3' ? 3 : dieType === 'd4' ? 4 : dieType === 'd6' ? 6 : dieType === 'd8' ? 8 : dieType === 'd10' ? 10 : dieType === 'd12' ? 12 : 20);
    setDiceConfigs(prev => [...prev, {
      id: newId,
      dieType,
      sides,
      count: 1,
      numericModifier: 0,
      advantage: 'none',
      rerollEnabled: false,
      rerollOperator: '<',
      rerollValue: 0
    }]);
  };

  const removeDiceConfig = (id: string) => {
    setDiceConfigs(prev => {
      if (prev.length > 1) {
        return prev.filter(config => config.id !== id);
      }
      return prev;
    });
  };

  const updateDiceConfig = (id: string, updates: Partial<DiceConfig>) => {
    setDiceConfigs(prev => prev.map(config =>
      config.id === id ? { ...config, ...updates } : config
    ));
  };

  return (
  <div className="p-6 lg:p-8 space-y-8">
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Controls Panel */}
  <div className="xl:col-span-2">
          <div className="card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 flex items-center">
              <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full mr-4"></div>
              Dice Configuration
            </h2>

            {/* Dice Configuration Table */}
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-600">
                      <th className="text-left py-2 text-slate-700 dark:text-slate-300">Die Type</th>
                      <th className="text-left py-2 text-slate-700 dark:text-slate-300">Count</th>
                      <th className="text-left py-2 text-slate-700 dark:text-slate-300">Roll modifier</th>
                      <th className="text-left py-2 text-slate-700 dark:text-slate-300">Reroll</th>
                      <th className="text-left py-2 text-slate-700 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diceConfigs.map((config, configIdx) => (
                      <tr key={config.id} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            {/* Show a compact die symbol/label instead of a dropdown. Keep an sr-only label for screen readers. */}
                            <div className="die-btn inline-flex items-center justify-center" aria-hidden="true">
                              <span className="text-sm font-medium">{config.dieType.toUpperCase()}{config.dieType === 'custom' ? `(${config.sides})` : ''}</span>
                            </div>
                            {/* Hidden select retained for accessibility/tests (visually offscreen but present as combobox) */}
                            <select aria-label="Die type" value={config.dieType} onChange={(e) => updateDiceConfig(config.id, { dieType: e.target.value as DieOption })} style={{position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden'}}>
                              <option value="d2">D2</option>
                              <option value="d3">D3</option>
                              <option value="d4">D4</option>
                              <option value="d6">D6</option>
                              <option value="d8">D8</option>
                              <option value="d10">D10</option>
                              <option value="d12">D12</option>
                              <option value="d20">D20</option>
                              <option value="custom">Custom</option>
                            </select>
                            <span className="sr-only">Die type {config.dieType}{config.dieType === 'custom' ? ` with ${config.sides} sides` : ''}</span>
                            {config.dieType === 'custom' && (
                              <NumberInput
                                id={`sides-${config.id}`}
                                value={String(config.sides)}
                                onChange={(v) => updateDiceConfig(config.id, { sides: Number(v) })}
                                step={1}
                                min={2}
                                placeholder="sides"
                                className="form-input--compact"
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-2">
                          <Counter value={config.count} min={1} max={20} onChange={(v) => updateDiceConfig(config.id, { count: v })} />
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-2">
                              <div className="inline-flex items-center gap-2">
                                <button type="button" onClick={() => updateDiceConfig(config.id, { advantage: config.advantage === 'adv' ? 'none' : 'adv' })} className={`text-gray-900 dark:text-white op-btn ${config.advantage === 'adv' ? 'active success' : ''}`} aria-pressed={config.advantage === 'adv'}>
                                  <span className="sr-only">Advantage</span>
                                  Adv
                                </button>
                                <button type="button" onClick={() => updateDiceConfig(config.id, { advantage: config.advantage === 'dis' ? 'none' : 'dis' })} className={`text-gray-900 dark:text-white op-btn ${config.advantage === 'dis' ? 'active danger' : ''}`} aria-pressed={config.advantage === 'dis'}>
                                  <span className="sr-only">Disadvantage</span>
                                  Dis
                                </button>
                              </div>

                              {config.advantage && config.advantage !== 'none' && (
                                <NumberInput value={String(config.numericModifier ?? 0)} onChange={(v) => updateDiceConfig(config.id, { numericModifier: Number(v || 0) })} step={1} className="form-input--compact" />
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <ModernCheckbox id={`reroll-${config.id}`} ariaLabel="Enabled" checked={!!config.rerollEnabled} onChange={(v) => updateDiceConfig(config.id, { rerollEnabled: v })} className="mr-1" />
                            {config.rerollEnabled && (
                              <>
                                <div className="inline-flex rounded-md overflow-hidden flex-shrink-0">
                                  {(['<','>','='] as ('<'|'>'|'=')[]).map((op) => (
                                    <button key={op} type="button" onClick={() => updateDiceConfig(config.id, { rerollOperator: op })} className={`text-gray-900 dark:text-white op-btn ${config.rerollOperator === op ? 'active' : ''}`} aria-pressed={config.rerollOperator === op}>{op}</button>
                                  ))}
                                </div>
                                <div style={{minWidth:'5rem'}}>
                                  <NumberInput placeholder="value" value={String(config.rerollValue ?? 0)} onChange={(v) => updateDiceConfig(config.id, { rerollValue: Number(v || 0) })} step={1} className="form-input--compact" />
                                </div>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Custom name toggle */}
                            <div className="flex items-center gap-1">
                              <ModernCheckbox
                                id={`name-${config.id}`}
                                ariaLabel="Custom group name"
                                checked={config.customName !== undefined}
                                onChange={(v) => updateDiceConfig(config.id, {
                                  customName: v ? getDisplayLabel(configIdx, diceConfigs) : undefined
                                })}
                              />
                              {config.customName !== undefined && (
                                <input
                                  type="text"
                                  value={config.customName}
                                  onChange={(e) => updateDiceConfig(config.id, { customName: e.target.value })}
                                  placeholder="Name"
                                  className="form-input form-input--compact"
                                  style={{ width: '7rem' }}
                                  aria-label="Group name"
                                />
                              )}
                            </div>
                            {diceConfigs.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeDiceConfig(config.id)}
                                className="text-gray-900 dark:text-white remove-btn"
                                aria-label={`Remove dice config ${config.id}`}
                              >
                                <span aria-hidden>✖</span>
                                <span className="sr-only">Remove</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="dice-add-group mt-3 mb-3">
                <button type="button" className="text-gray-900 dark:text-white die-btn op-btn" onClick={() => addDiceConfigWithType('d2')} aria-label="Add D2">D2</button>
                <button type="button" className="text-gray-900 dark:text-white die-btn op-btn" onClick={() => addDiceConfigWithType('d3')} aria-label="Add D3">D3</button>
                <button type="button" className="text-gray-900 dark:text-white die-btn op-btn" onClick={() => addDiceConfigWithType('d4')} aria-label="Add D4">D4</button>
                <button type="button" className="text-gray-900 dark:text-white die-btn op-btn" onClick={() => addDiceConfigWithType('d6')} aria-label="Add D6">D6</button>
                <button type="button" className="text-gray-900 dark:text-white die-btn op-btn" onClick={() => addDiceConfigWithType('d8')} aria-label="Add D8">D8</button>
                <button type="button" className="text-gray-900 dark:text-white die-btn op-btn" onClick={() => addDiceConfigWithType('d10')} aria-label="Add D10">D10</button>
                <button type="button" className="text-gray-900 dark:text-white die-btn op-btn" onClick={() => addDiceConfigWithType('d12')} aria-label="Add D12">D12</button>
                <button type="button" className="text-gray-900 dark:text-white die-btn op-btn" onClick={() => addDiceConfigWithType('d20')} aria-label="Add D20">D20</button>
                <button type="button" className="text-gray-900 dark:text-white die-btn op-btn" onClick={() => addDiceConfigWithType('custom')} aria-label="Add Custom">Custom</button>
              </div>

              {/* Charts Toggle */}
              <div>
                <ModernCheckbox ariaLabel="Show Charts" checked={showCharts} onChange={(v) => setShowCharts(v)} label={<span className="text-sm text-gray-700 dark:text-gray-300">Show Charts</span>} />
              </div>

              {/* Roll Button */}
              <Button variant="primary" onClick={onRoll} disabled={loading} className="mt-6 w-full text-base">
                {loading ? (
                  <div className="flex items-center justify-center">
                    <span className="spinner animate-spin mr-2 text-current" />
                    Rolling...
                  </div>
                ) : (
                  'Roll Dice'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
          <div className="xl:col-span-2 space-y-6">
          {lastResult ? (
            <div className="card animate-scale-in" style={{ animationDelay: '100ms' }}>
              {/* Header: title + grand total */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center" style={{ color: 'var(--fg)' }}>
                  <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full mr-4 flex-shrink-0" />
                  Latest Roll Results
                </h2>
                <div className="text-right">
                  <div className="text-3xl font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
                    {lastResult.rolls.reduce((t, r) => t + r.sum, 0)}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>grand total</div>
                </div>
              </div>

              {/* Dice Results table with stat columns */}
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Dice Results</h4>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <th className="text-left py-1.5 pr-3 text-xs font-medium" style={{ color: 'var(--muted)', width: '15%' }}>Die</th>
                      <th className="text-left py-1.5 pr-3 text-xs font-medium" style={{ color: 'var(--muted)' }}>Values</th>
                      <th className="text-right py-1.5 pr-3 text-xs font-medium" style={{ color: 'var(--muted)', width: '7%' }}>Avg</th>
                      <th className="text-right py-1.5 pr-3 text-xs font-medium" style={{ color: 'var(--muted)', width: '7%' }}>Min</th>
                      <th className="text-right py-1.5 pr-3 text-xs font-medium" style={{ color: 'var(--muted)', width: '7%' }}>Max</th>
                      <th className="text-right py-1.5 pr-3 text-xs font-medium" style={{ color: 'var(--muted)', width: '9%' }}>
                        Prob
                        <span
                          title="Normalized probability: 1.0 = most probable sum for this die combination. Shows how likely your exact result is relative to the most common outcome."
                          style={{ cursor: 'help', marginLeft: '0.2rem', opacity: 0.65, fontSize: '0.6rem' }}
                        >(?)</span>
                      </th>
                      <th className="text-right py-1.5 text-xs font-medium" style={{ color: 'var(--muted)', width: '8%' }}>Sum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastResult.rolls.map((r, i) => {
                      const cfg = diceConfigs[Math.min(i, diceConfigs.length - 1)];
                      const label = getDisplayLabel(i, diceConfigs);
                      const hasValues = r.used.length > 0;

                      // Normalized probability (only meaningful for 2+ dice, sides ≤ 20)
                      let normProb: number | null = null;
                      if (cfg.count >= 2 && cfg.sides <= 20) {
                        const dist = computeSumDist(cfg.count, cfg.sides);
                        const maxW = Math.max(...dist.values());
                        const w = dist.get(r.sum) ?? 0;
                        normProb = maxW > 0 ? w / maxW : null;
                      }

                      const hasBoxHist = showCharts && r.used.length > 1;
                      const hasProbChart = showCharts && cfg.count >= 2 && cfg.sides <= 20;
                      const showChartsRow = hasBoxHist || hasProbChart;

                      // Grid columns for charts row
                      const chartCols = (hasBoxHist ? 2 : 0) + (hasProbChart ? 1 : 0);
                      const gridCols = chartCols === 3 ? '1fr 1fr 1fr' : chartCols === 2 ? '1fr 1fr' : '1fr';

                      return (
                        <React.Fragment key={i}>
                          {/* Main result row with all stats as columns */}
                          <tr style={{ borderBottom: showChartsRow ? 'none' : '1px solid var(--card-border)', borderTop: i > 0 ? '2px solid var(--accent)' : undefined }}>
                            <td className="py-2 pr-3">
                              <span className="inline-flex items-center justify-center text-xs font-semibold rounded px-1.5 py-0.5"
                                style={{ background: 'var(--accent)', color: 'white' }}>{label}</span>
                              {cfg.count > 1 && (
                                <span className="ml-1 text-xs" style={{ color: 'var(--muted)' }}>×{cfg.count}</span>
                              )}
                            </td>
                            <td className="py-2 pr-3 font-mono">
                              {r.perDie.map((d, idx) => (
                                <span key={idx} className="mr-2">
                                  {d.original.length > 1 ? (
                                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{d.original.join(' → ')}</span>
                                  ) : (
                                    <span style={{ color: 'var(--fg)' }}>{d.final}</span>
                                  )}
                                </span>
                              ))}
                            </td>
                            <td className="py-2 pr-3 text-right tabular-nums text-xs" style={{ color: 'var(--muted)' }}>
                              {hasValues ? r.average.toFixed(1) : '-'}
                            </td>
                            <td className="py-2 pr-3 text-right tabular-nums text-xs" style={{ color: 'var(--muted)' }}>
                              {hasValues ? Math.min(...r.used) : '-'}
                            </td>
                            <td className="py-2 pr-3 text-right tabular-nums text-xs" style={{ color: 'var(--muted)' }}>
                              {hasValues ? Math.max(...r.used) : '-'}
                            </td>
                            <td className="py-2 pr-3 text-right tabular-nums text-xs" style={{ color: 'var(--muted)' }}>
                              {normProb !== null ? `${(normProb * 100).toFixed(0)}%` : '-'}
                            </td>
                            <td className="py-2 text-right font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
                              {r.sum}
                            </td>
                          </tr>
                          {/* Charts row — compact single row with all charts side by side */}
                          {showChartsRow && (
                            <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                              <td colSpan={7} className="pb-3 pt-1">
                                <div className="grid gap-3" style={{ gridTemplateColumns: gridCols }}>
                                  {hasBoxHist && (
                                    <div>
                                      <div className="text-xs mb-0.5 font-medium" style={{ color: 'var(--muted)' }}>Spread (box plot)</div>
                                      <div className="h-4"><Boxplot values={r.used} className="w-full h-full" /></div>
                                    </div>
                                  )}
                                  {hasBoxHist && (
                                    <div>
                                      <div className="text-xs mb-0.5 font-medium" style={{ color: 'var(--muted)' }}>Roll frequency</div>
                                      <div className="h-4"><Histogram values={r.used} className="w-full h-full" /></div>
                                    </div>
                                  )}
                                  {hasProbChart && (() => {
                                    const dist = computeSumDist(cfg.count, cfg.sides);
                                    const vals = Array.from(dist.entries()).sort((a, b) => a[0] - b[0]);
                                    const maxW = Math.max(...vals.map(([, w]) => w));
                                    const barW = 90 / vals.length;
                                    const minSum = vals[0]?.[0] ?? 0;
                                    const maxSum = vals[vals.length - 1]?.[0] ?? 0;
                                    return (
                                      <div>
                                        <div className="text-xs mb-0.5 font-medium" style={{ color: 'var(--muted)' }}>Sum probability ({cfg.count}×D{cfg.sides})</div>
                                        <svg viewBox="0 0 100 26" className="w-full h-8">
                                          {vals.map(([s, w], idx) => {
                                            const h = Math.max(1, (w / maxW) * 18);
                                            const x = 5 + idx * barW;
                                            const isActual = s === r.sum;
                                            return (
                                              <rect key={s} x={x} y={19 - h} width={Math.max(0.5, barW - 0.5)} height={h}
                                                fill={isActual ? 'white' : 'var(--accent)'} opacity={isActual ? 1 : 0.45} rx="0.5" />
                                            );
                                          })}
                                          <text x="5" y="25" fontSize="3.5" textAnchor="middle" fill="currentColor" opacity="0.5">{minSum}</text>
                                          <text x="50" y="25" fontSize="3.5" textAnchor="middle" fill="currentColor" opacity="0.7">rolled: {r.sum}</text>
                                          <text x="95" y="25" fontSize="3.5" textAnchor="middle" fill="currentColor" opacity="0.5">{maxSum}</text>
                                        </svg>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card text-center animate-fade-in-up" style={{ background: 'var(--input-bg)' }}>
              <DiceIcon className="!w-12 !h-12 mx-auto mb-4" style={{ color: 'var(--muted)' } as React.CSSProperties} />
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--fg)' }}>Ready to Roll</h3>
              <p style={{ color: 'var(--muted)' }}>Configure your dice and click "Roll Dice" to get started!</p>
            </div>
          )}

          {/* History */}
          <div className="card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 flex items-center">
              <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-violet-600 rounded-full mr-4"></div>
              Roll History
            </h2>
            <DiceHistory entries={history} source={historySource} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DiceRoller;
