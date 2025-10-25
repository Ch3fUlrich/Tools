"use client";

import React, { useState } from 'react';
import DiceIcon from '../icons/DiceIcon';
import RerollIcon from '../icons/RerollIcon';
import AdvantageIcon from '../icons/AdvantageIcon';
import { rollDice } from '../../lib/api/client';
import DiceHistory from './DiceHistory';
import Boxplot from '../charts/Boxplot';
import Histogram from '../charts/Histogram';
import type { DiceResponse } from '../../lib/types/dice';

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
};

const DIE_FACES = {
  d2: '⚀⚁',
  d3: '⚀⚁⚂',
  d4: '⚀⚁⚂⚃',
  d6: '⚀⚁⚂⚃⚄⚅',
  d8: '⚀⚁⚂⚃⚄⚅⚆⚇',
  d10: '⚀⚁⚂⚃⚄⚅⚆⚇⚈⚉',
  d12: '⚀⚁⚂⚃⚄⚅⚆⚇⚈⚉⚊⚋',
  d20: '⚀⚁⚂⚃⚄⚅⚆⚇⚈⚉⚊⚋⚌⚍⚎⚏',
  custom: '🎲'
};

export const DiceRoller: React.FC = () => {
  const [diceConfigs, setDiceConfigs] = useState<DiceConfig[]>([
    { id: '1', dieType: 'd6', sides: 6, count: 1 }
  ]);
  const [advantage, setAdvantage] = useState<'none'|'adv'|'dis'>('none');

  const [history, setHistory] = useState<Array<{ time: string; summary?: { sum?: number }; details?: RollDetail[] }>>([]);
  const [lastResult, setLastResult] = useState<DiceResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

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
          count: config.count, 
          advantage 
        };
        return await rollDice(payload);
      });

      const results = await Promise.all(rollPromises);
      
      // Combine all results into a single response
      const combinedResult: DiceResponse = {
        rolls: results.flatMap(r => r.rolls),
        summary: { totalRollsRequested: results.length }
      };

      const entry = { 
        time: new Date().toLocaleTimeString(), 
        summary: { sum: combinedResult.rolls.reduce((total, roll) => total + roll.sum, 0) }, 
        details: combinedResult.rolls as RollDetail[] 
      };
      setHistory(h => [entry, ...h]);
      setLastResult(combinedResult);
    } catch(err){
      console.error('roll error', err);
      alert('Roll failed: '+String(err));
    }
    finally { setLoading(false); }
  };

  const addDiceConfig = () => {
    const newId = Date.now().toString();
    setDiceConfigs([...diceConfigs, { id: newId, dieType: 'd6', sides: 6, count: 1 }]);
  };

  const removeDiceConfig = (id: string) => {
    if (diceConfigs.length > 1) {
      setDiceConfigs(diceConfigs.filter(config => config.id !== id));
    }
  };

  const updateDiceConfig = (id: string, updates: Partial<DiceConfig>) => {
    setDiceConfigs(diceConfigs.map(config => 
      config.id === id ? { ...config, ...updates } : config
    ));
  };;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <DiceIcon className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Dice Roller
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Roll dice with advantage, disadvantage, and detailed statistics
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Controls Panel */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <div className="w-2 h-8 bg-indigo-500 rounded-full mr-3"></div>
              Dice Configuration
            </h2>

            {/* Dice Configuration Table */}
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">Die Type</th>
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">Count</th>
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diceConfigs.map((config, index) => (
                      <tr key={config.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={config.dieType}
                              onChange={(e) => updateDiceConfig(config.id, { dieType: e.target.value as DieOption })}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              {(['d2', 'd3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'custom'] as DieOption[]).map((dieType) => (
                                <option key={dieType} value={dieType}>
                                  {DIE_FACES[dieType]} {dieType.toUpperCase()}
                                </option>
                              ))}
                            </select>
                            {config.dieType === 'custom' && (
                              <input
                                type="number"
                                min={2}
                                max={100}
                                value={config.sides}
                                onChange={(e) => updateDiceConfig(config.id, { sides: Number(e.target.value) })}
                                className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="sides"
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={config.count}
                            onChange={(e) => updateDiceConfig(config.id, { count: Number(e.target.value) })}
                            className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="py-3">
                          {diceConfigs.length > 1 && (
                            <button
                              onClick={() => removeDiceConfig(config.id)}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={addDiceConfig}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
              >
                + Add Dice Type
              </button>

              {/* Advantage/Disadvantage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Roll Modifier
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAdvantage('none')}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                      advantage === 'none'
                        ? 'border-gray-500 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    None
                  </button>
                  <button
                    onClick={() => setAdvantage('adv')}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                      advantage === 'adv'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <AdvantageIcon className="inline w-4 h-4 mr-1" />
                    Advantage
                  </button>
                  <button
                    onClick={() => setAdvantage('dis')}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                      advantage === 'dis'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <AdvantageIcon className="inline w-4 h-4 mr-1 rotate-180" />
                    Disadvantage
                  </button>
                </div>
              </div>

              {/* Charts Toggle */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showCharts}
                    onChange={(e) => setShowCharts(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show Charts</span>
                </label>
              </div>

              {/* Roll Button */}
              <button
                onClick={onRoll}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed text-base mt-6"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Rolling...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <DiceIcon className="w-5 h-5 mr-2" />
                    Roll Dice
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-2 space-y-6">
          {lastResult ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
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
                        {advantage !== 'none' && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            advantage === 'adv' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                          }`}>
                            {advantage === 'adv' ? 'Advantage' : 'Disadvantage'}
                          </span>
                        )}
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
                        <table className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg">
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
                                  {diceConfigs.length > 0 ? 
                                    `${diceConfigs[Math.min(idx, diceConfigs.length - 1)].dieType.toUpperCase()}${diceConfigs[Math.min(idx, diceConfigs.length - 1)].dieType === 'custom' ? `(${diceConfigs[Math.min(idx, diceConfigs.length - 1)].sides})` : ''}` 
                                    : 'D6'
                                  }
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
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
              <DiceIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ready to Roll</h3>
              <p className="text-gray-600 dark:text-gray-400">Configure your dice and click "Roll Dice" to get started!</p>
            </div>
          )}

          {/* History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
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
