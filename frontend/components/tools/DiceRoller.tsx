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

export const DiceRoller: React.FC = () => {
  const [die, setDie] = useState<DieOption>('d6');
  const [sides, setSides] = useState<number>(6);
  const [count, setCount] = useState<number>(1);
  const [advantage, setAdvantage] = useState<'none'|'adv'|'dis'>('none');

  const [history, setHistory] = useState<Array<{ time: string; summary?: { sum?: number }; details?: RollDetail[] }>>([]);
  const [lastResult, setLastResult] = useState<DiceResponse | null>(null);

  const [loading, setLoading] = useState(false);

  const onRoll = async () => {
    const payload = { die: { type: die, sides: die==='custom'?sides:undefined }, count, advantage };
    try {
      setLoading(true);
      const resp = await rollDice(payload);
    const entry = { time: new Date().toLocaleTimeString(), summary: resp.summary, details: resp.rolls as RollDetail[] };
      setHistory(h => [entry, ...h]);
      setLastResult(resp as DiceResponse);
    } catch(err){
      console.error('roll error', err);
      alert('Roll failed: '+String(err));
    }
    finally { setLoading(false); }
  }

  return (
    <section className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      <header className="flex items-center gap-2 mb-4">
        <DiceIcon className="w-6 h-6 text-indigo-600" />
        <h2 className="text-lg font-semibold">Dice Roller</h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-sm text-gray-600">Die</label>
          <select className="mt-1 block w-full rounded-md border-gray-200" value={die} onChange={e=>setDie(e.target.value as DieOption)}>
            <option value="d2">d2</option>
            <option value="d3">d3</option>
            <option value="d4">d4</option>
            <option value="d6">d6</option>
            <option value="d8">d8</option>
            <option value="d10">d10</option>
            <option value="d12">d12</option>
            <option value="d20">d20</option>
            <option value="custom">custom</option>
          </select>
        </div>

        {die === 'custom' && (
          <div>
            <label className="block text-sm text-gray-600">Sides</label>
            <input type="number" min={2} value={sides} onChange={e=>setSides(Number(e.target.value))} className="mt-1 block w-full rounded-md border-gray-200" />
          </div>
        )}

        <div>
          <label className="block text-sm text-gray-600">Count</label>
          <input type="number" min={1} value={count} onChange={e=>setCount(Number(e.target.value))} className="mt-1 block w-full rounded-md border-gray-200" />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Advantage</label>
          <div className="mt-1 flex gap-2 items-center">
            <button className={`px-3 py-1 rounded ${advantage==='none'?'bg-gray-100':'bg-indigo-50'}`} onClick={()=>setAdvantage('none')}>None</button>
            <button className={`px-3 py-1 rounded ${advantage==='adv'?'bg-green-100':'bg-gray-100'}`} onClick={()=>setAdvantage('adv')}><AdvantageIcon className="inline mr-1"/>Adv</button>
            <button className={`px-3 py-1 rounded ${advantage==='dis'?'bg-red-100':'bg-gray-100'}`} onClick={()=>setAdvantage('dis')}><AdvantageIcon className="inline mr-1 rotate-180"/>Dis</button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onRoll} aria-label="Roll dice" disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60" onKeyDown={(e)=>{ if(e.key==='Enter'){ onRoll(); } }}>
          <DiceIcon className="w-4 h-4 text-white" /> Roll
        </button>

        <button aria-label="Reroll low dice" className="inline-flex items-center gap-2 px-4 py-2 rounded border border-gray-200 text-gray-700 hover:bg-gray-50">
          <RerollIcon className="w-4 h-4" /> Reroll Low
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
          {lastResult ? (
            <div>
              {lastResult.rolls.map((r, i) => (
                <div key={i} className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">Roll {i+1}</div>
                    <div className="text-sm text-gray-500">Sum: {r.sum} • Avg: {r.average.toFixed(2)}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div className="col-span-2">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="text-left text-xs text-gray-500">
                            <th className="pb-2">Die</th>
                            <th className="pb-2">Original / Rerolls</th>
                            <th className="pb-2">Final</th>
                          </tr>
                        </thead>
                        <tbody>
                                  {r.perDie.map((d: PerDie, idx: number) => (
                                    <tr key={idx} className="border-t">
                                      <td className="py-2">{idx+1}</td>
                                      <td className="py-2">{d.original.join(', ')}</td>
                                      <td className="py-2">{d.final}</td>
                                    </tr>
                                  ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-2">
                      <Boxplot values={r.used} className="w-full h-6" />
                      <Histogram values={r.used} className="w-full h-8 mt-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No recent result. Click Roll to perform a roll.</div>
          )}
        </div>
        <DiceHistory entries={history} />
      </div>
    </section>
  )
}

export default DiceRoller;
