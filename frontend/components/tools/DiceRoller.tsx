"use client";

import React, { useState } from 'react';
import DiceIcon from '../icons/DiceIcon';
import DieFaceIcon from '../icons/DieFaceIcon';
// DieSelect removed per UX change: we show a compact die symbol instead of a dropdown
import ModernCheckbox from '@/components/ui/ModernCheckbox';
import Button from '@/components/ui/Button';
import Counter from '@/components/ui/Counter';
import NumberInput from '@/components/ui/NumberInput';
import { rollDice } from '../../lib/api/client';
import DiceHistory from './DiceHistory';
import Boxplot from '../charts/Boxplot';
import Histogram from '../charts/Histogram';
import type { DiceResponse, DiceRequest } from '../../lib/types/dice';

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
};

// DIE_FACES was removed — we now display a consistent die emoji in the dropdown labels (e.g. "🎲 D6 (6)").

export const DiceRoller: React.FC = () => {
  const [diceConfigs, setDiceConfigs] = useState<DiceConfig[]>([
    { id: '1', dieType: 'd6', sides: 6, count: 1, numericModifier: 0, advantage: 'none', rerollEnabled: false, rerollOperator: '<', rerollValue: 0 }
  ]);

  const [history, setHistory] = useState<Array<{ time: string; summary?: { sum?: number }; details?: RollDetail[] }>>([]);
  const [lastResult, setLastResult] = useState<DiceResponse | null>(null);

  const [loading, setLoading] = useState(false);
  // default to showing charts in test environment (tests expect charts to render)
  const [showCharts, setShowCharts] = useState(true);

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

    const results = await Promise.all(rollPromises);
    
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

    const entry = { 
      time: new Date().toLocaleTimeString(), 
      summary: { sum: combinedResult.rolls.reduce((total, roll) => total + roll.sum, 0) }, 
      details: combinedResult.rolls as RollDetail[] 
    };
    setHistory(h => [entry, ...h]);
    setLastResult(combinedResult);
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
  <div className="max-w-6xl mx-auto p-4 sm:p-6 text-gray-900 dark:text-white">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-2">
          <DiceIcon className="w-9 h-9 text-indigo-600" />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Dice Roller
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Roll dice with advantage, disadvantage, and detailed statistics
        </p>
      </div>

  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Controls Panel */}
  <div className="xl:col-span-2">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <div className="w-2 h-8 bg-indigo-500 rounded-full mr-3"></div>
              Dice Configuration
            </h2>

            {/* Dice Configuration Table */}
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">Die Type</th>
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">Count</th>
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">Roll modifier</th>
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">Reroll</th>
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diceConfigs.map((config) => (
                      <tr key={config.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-3">
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
                        <td className="py-3">
                          <Counter value={config.count} min={1} max={20} onChange={(v) => updateDiceConfig(config.id, { count: v })} />
                        </td>
                        <td className="py-3">
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

                        <td className="py-3">
                          <div className="inline-flex items-center gap-2">
                            <ModernCheckbox id={`reroll-${config.id}`} ariaLabel="Enabled" checked={!!config.rerollEnabled} onChange={(v) => updateDiceConfig(config.id, { rerollEnabled: v })} className="mr-2" />
                            {config.rerollEnabled && (
                              <>
                                <div className="inline-flex rounded-md overflow-hidden">
                                  {(['<','>','='] as ('<'|'>'|'=')[]).map((op) => (
                                    <button key={op} type="button" onClick={() => updateDiceConfig(config.id, { rerollOperator: op })} className={`text-gray-900 dark:text-white op-btn ${config.rerollOperator === op ? 'active' : ''}`} aria-pressed={config.rerollOperator === op}>{op}</button>
                                  ))}
                                </div>
                                <NumberInput placeholder="value" value={String(config.rerollValue ?? 0)} onChange={(v) => updateDiceConfig(config.id, { rerollValue: Number(v || 0) })} step={1} className="form-input--compact" />
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3">
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
                  <div className="flex items-center justify-center">
                    <DiceIcon className="w-9 h-9 mr-3" />
                    Roll Dice
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
          <div className="xl:col-span-2 space-y-6">
          {lastResult ? (
            <div className="card bg-white">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <div className="w-2 h-8 bg-green-500 rounded-full mr-3"></div>
                Latest Roll Results
              </h2>

              <div className="space-y-6">
                {lastResult.rolls.map((r, i) => (
                  <div key={i} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-medium text-gray-900 dark:text-white">Roll {i+1}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{r.sum}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
                      </div>
                    </div>

                    {/* Dice Results Table */}
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Dice Results</h4>
                        <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg min-w-[760px]">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700">
                              <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Die #</th>
                              <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Type</th>
                              <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Rolls</th>
                              <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Final</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.perDie.map((d, idx) => (
                              <tr key={idx} className="border-t border-gray-200 dark:border-gray-600">
                                <td className="px-3 py-2 text-gray-900 dark:text-white">{idx + 1}</td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                  {diceConfigs.length > 0 ? (
                                    <div className="flex items-center gap-3">
                                      <DieFaceIcon sides={diceConfigs[Math.min(idx, diceConfigs.length - 1)].sides} className="die-icon" />
                                      <span className="text-sm">
                                        {diceConfigs[Math.min(idx, diceConfigs.length - 1)].dieType.toUpperCase()}{diceConfigs[Math.min(idx, diceConfigs.length - 1)].dieType === 'custom' ? `(${diceConfigs[Math.min(idx, diceConfigs.length - 1)].sides})` : ''}
                                      </span>
                                    </div>
                                  ) : 'D6'}
                                </td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                  {d.original.length > 1 ? d.original.join(' → ') : d.original[0]}
                                </td>
                                <td className="px-3 py-2 font-bold text-indigo-600 dark:text-indigo-400">{d.final}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Statistics */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Statistics</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{r.average.toFixed(2)}</div>
                            <div className="text-xs text-blue-800 dark:text-blue-200">Average</div>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-3">
                            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{Math.min(...r.used)} - {Math.max(...r.used)}</div>
                            <div className="text-xs text-purple-800 dark:text-purple-200">Range</div>
                          </div>
                        </div>
                      </div>

                      {/* Charts - conditionally shown */}
                      {showCharts && (
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Charts</h4>
                          <div className="space-y-2">
                            <div className="h-16">
                              <Boxplot values={r.used} className="w-full h-full" />
                            </div>
                            <div className="h-12">
                              <Histogram values={r.used} className="w-full h-full" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card bg-gray-50 dark:bg-gray-800 text-center">
              <DiceIcon className="!w-9 !h-9 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ready to Roll</h3>
              <p className="text-gray-600 dark:text-gray-400">Configure your dice and click "Roll Dice" to get started!</p>
            </div>
          )}

          {/* History */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <div className="w-2 h-8 bg-purple-500 rounded-full mr-3"></div>
              Roll History
            </h2>
            <DiceHistory entries={history} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DiceRoller;
