"use client";

import React, { useState } from 'react';
import DiceIcon from '../icons/DiceIcon';
import DieFaceIcon from '../icons/DieFaceIcon';
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
  numericModifier?: number;
  advantage?: 'none' | 'adv' | 'dis';
  rerollEnabled?: boolean;
  rerollOperator?: '<'|'>'|'=';
  rerollValue?: number;
};

export const DiceRoller: React.FC = () => {
  const [diceConfigs, setDiceConfigs] = useState<DiceConfig[]>([
    { id: '1', dieType: 'd6', sides: 6, count: 1, numericModifier: 0, advantage: 'none', rerollEnabled: false, rerollOperator: '<', rerollValue: 0 }
  ]);

  const [history, setHistory] = useState<Array<{ time: string; summary?: { sum?: number }; details?: RollDetail[] }>>([]);
  const [lastResult, setLastResult] = useState<DiceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCharts, setShowCharts] = useState(true);

const onRoll = async () => {
  if (diceConfigs.length === 0) return;

  try {
    setLoading(true);
    
    const rollPromises = diceConfigs.map(async (config) => {
      const payload = { 
        die: { 
          type: config.dieType, 
          sides: config.dieType === 'custom' ? config.sides : undefined 
        }, 
        count: config.count
      };
      
  return await rollDice(payload as DiceRequest);
    });

    const results = await Promise.all(rollPromises);
    
    let combinedResult: DiceResponse = {
      rolls: results.flatMap(r => r.rolls),
      summary: { totalRollsRequested: results.length }
    };

    combinedResult = {
      ...combinedResult,
      rolls: combinedResult.rolls.map((roll, _rollIndex) => {
        const cloned = JSON.parse(JSON.stringify(roll));
        let anyChanged = false;
        cloned.perDie = cloned.perDie.map((d: PerDie, idx: number) => {
          const cfg = diceConfigs[Math.min(idx, diceConfigs.length - 1)];
          const sides = cfg?.sides || 6;

          const originalFinal = d.final;

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

          if (cfg && Number.isFinite(cfg.numericModifier || NaN) && cfg.advantage && cfg.advantage !== 'none') {
            const delta = cfg.advantage === 'adv' ? (cfg.numericModifier || 0) : -(cfg.numericModifier || 0);
            d.final = d.final + delta;
          }

          if (d.final !== originalFinal) anyChanged = true;
          return d;
        });

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
      {/* Enhanced Header */}
      <div className="text-center animate-fade-in-up">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-soft-lg">
            <DiceIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Dice Roller
          </h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
          Roll dice with advantage, disadvantage, and detailed statistics
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Controls Panel */}
        <div className="xl:col-span-2 space-y-6">
          <div className="card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full mr-4"></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Dice Configuration
              </h2>
            </div>

            {/* Enhanced Dice Configuration Table */}
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px] styled-table">
                  <thead>
                    <tr>
                      <th className="text-left py-3 px-4">Die Type</th>
                      <th className="text-left py-3 px-4">Count</th>
                      <th className="text-left py-3 px-4">Roll modifier</th>
                      <th className="text-left py-3 px-4">Reroll</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diceConfigs.map((config) => (
                      <tr key={config.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="die-btn inline-flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                              <span className="text-sm font-bold">{config.dieType.toUpperCase()}{config.dieType === 'custom' ? `(${config.sides})` : ''}</span>
                            </div>
                            <select 
                              aria-label="Die type" 
                              value={config.dieType} 
                              onChange={(e) => updateDiceConfig(config.id, { dieType: e.target.value as DieOption })} 
                              className="sr-only"
                            >
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
                        <td className="py-4 px-4">
                          <Counter value={config.count} min={1} max={20} onChange={(v) => updateDiceConfig(config.id, { count: v })} />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-1">
                              <button 
                                type="button" 
                                onClick={() => updateDiceConfig(config.id, { advantage: config.advantage === 'adv' ? 'none' : 'adv' })} 
                                className={`op-btn ${config.advantage === 'adv' ? 'active success' : ''}`} 
                                aria-pressed={config.advantage === 'adv'}
                              >
                                <span className="sr-only">Advantage</span>
                                Adv
                              </button>
                              <button 
                                type="button" 
                                onClick={() => updateDiceConfig(config.id, { advantage: config.advantage === 'dis' ? 'none' : 'dis' })} 
                                className={`op-btn ${config.advantage === 'dis' ? 'active danger' : ''}`} 
                                aria-pressed={config.advantage === 'dis'}
                              >
                                <span className="sr-only">Disadvantage</span>
                                Dis
                              </button>
                            </div>

                            {config.advantage && config.advantage !== 'none' && (
                              <NumberInput 
                                value={String(config.numericModifier ?? 0)} 
                                onChange={(v) => updateDiceConfig(config.id, { numericModifier: Number(v || 0) })} 
                                step={1} 
                                className="form-input--compact" 
                              />
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="inline-flex items-center gap-2">
                            <ModernCheckbox 
                              id={`reroll-${config.id}`} 
                              ariaLabel="Enabled" 
                              checked={!!config.rerollEnabled} 
                              onChange={(v) => updateDiceConfig(config.id, { rerollEnabled: v })} 
                            />
                            {config.rerollEnabled && (
                              <>
                                <div className="inline-flex rounded-md overflow-hidden shadow-soft">
                                  {(['<','>','='] as ('<'|'>'|'=')[]).map((op) => (
                                    <button 
                                      key={op} 
                                      type="button" 
                                      onClick={() => updateDiceConfig(config.id, { rerollOperator: op })} 
                                      className={`op-btn ${config.rerollOperator === op ? 'active' : ''}`} 
                                      aria-pressed={config.rerollOperator === op}
                                    >
                                      {op}
                                    </button>
                                  ))}
                                </div>
                                <NumberInput 
                                  placeholder="value" 
                                  value={String(config.rerollValue ?? 0)} 
                                  onChange={(v) => updateDiceConfig(config.id, { rerollValue: Number(v || 0) })} 
                                  step={1} 
                                  className="form-input--compact" 
                                />
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {diceConfigs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDiceConfig(config.id)}
                              className="remove-btn group-hover:scale-105 transition-transform duration-200"
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

              {/* Enhanced Quick Add Buttons */}
              <div className="dice-add-group mt-6 mb-6">
                <button 
                  type="button" 
                  className="die-btn" 
                  onClick={() => addDiceConfigWithType('d2')} 
                  aria-label="Add D2"
                >D2</button>
                <button 
                  type="button" 
                  className="die-btn" 
                  onClick={() => addDiceConfigWithType('d3')} 
                  aria-label="Add D3"
                >D3</button>
                <button 
                  type="button" 
                  className="die-btn" 
                  onClick={() => addDiceConfigWithType('d4')} 
                  aria-label="Add D4"
                >D4</button>
                <button 
                  type="button" 
                  className="die-btn" 
                  onClick={() => addDiceConfigWithType('d6')} 
                  aria-label="Add D6"
                >D6</button>
                <button 
                  type="button" 
                  className="die-btn" 
                  onClick={() => addDiceConfigWithType('d8')} 
                  aria-label="Add D8"
                >D8</button>
                <button 
                  type="button" 
                  className="die-btn" 
                  onClick={() => addDiceConfigWithType('d10')} 
                  aria-label="Add D10"
                >D10</button>
                <button 
                  type="button" 
                  className="die-btn" 
                  onClick={() => addDiceConfigWithType('d12')} 
                  aria-label="Add D12"
                >D12</button>
                <button 
                  type="button" 
                  className="die-btn" 
                  onClick={() => addDiceConfigWithType('d20')} 
                  aria-label="Add D20"
                >D20</button>
                <button 
                  type="button" 
                  className="die-btn" 
                  onClick={() => addDiceConfigWithType('custom')} 
                  aria-label="Add Custom"
                >Custom</button>
              </div>

              {/* Charts Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <ModernCheckbox 
                  ariaLabel="Show Charts" 
                  checked={showCharts} 
                  onChange={(v) => setShowCharts(v)} 
                  label={<span className="text-sm font-medium text-slate-700 dark:text-slate-300">Show Charts</span>} 
                />
              </div>

              {/* Enhanced Roll Button */}
              <Button 
                variant="primary" 
                onClick={onRoll} 
                disabled={loading} 
                className="w-full h-14 text-lg font-semibold shadow-soft-lg hover:shadow-soft-xl transition-all duration-300"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner mr-3" />
                    Rolling...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <DiceIcon className="w-8 h-8 mr-3" />
                    Roll Dice
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-1 space-y-6">
          {lastResult ? (
            <div className="card animate-scale-in" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center mb-6">
                <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full mr-4"></div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Latest Roll
                </h2>
              </div>

              <div className="space-y-6">
                {/* Enhanced Total Display */}
                <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl">
                  <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                    {lastResult.rolls.reduce((total, roll) => total + roll.sum, 0)}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Total Roll
                  </div>
                </div>

                {lastResult.rolls.map((r, i) => (
                  <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-soft transition-shadow duration-200">
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-lg font-medium text-slate-900 dark:text-white">Roll {i+1}</span>
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{r.sum}</div>
                      </div>

                      {/* Enhanced Dice Results */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {r.used.map((value, idx) => (
                          <div key={idx} className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="text-lg font-bold text-slate-900 dark:text-white">{value}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {diceConfigs[Math.min(idx, diceConfigs.length - 1)]?.dieType.toUpperCase()}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Statistics */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{r.average.toFixed(2)}</div>
                          <div className="text-xs text-blue-800 dark:text-blue-200">Average</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{Math.min(...r.used)} - {Math.max(...r.used)}</div>
                          <div className="text-xs text-purple-800 dark:text-purple-200">Range</div>
                        </div>
                      </div>

                      {/* Charts */}
                      {showCharts && (
                        <div className="mt-4 space-y-3">
                          <div className="h-16">
                            <Boxplot values={r.used} className="w-full h-full" />
                          </div>
                          <div className="h-12">
                            <Histogram values={r.used} className="w-full h-full" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card text-center animate-fade-in-up">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-2xl mb-4">
                <DiceIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Ready to Roll</h3>
              <p className="text-slate-600 dark:text-slate-400">Configure your dice and click "Roll Dice" to get started!</p>
            </div>
          )}

          {/* History */}
          <div className="card animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full mr-4"></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Roll History
              </h2>
            </div>
            <DiceHistory entries={history} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DiceRoller;