/* global HTMLDivElement, MouseEvent, Node */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import NumberInput from '@/components/ui/NumberInput';
import ErrorAlert from '@/components/ui/ErrorAlert';
import CardSection from '@/components/ui/CardSection';
import { calculateFatLoss, type FatLossResponse } from '../../lib/api/client';
import FatLossVisualization from './FatLossVisualization';

export const FatLossCalculator: React.FC = () => {
  const [kcalDeficit, setKcalDeficit] = useState<string>('');
  const [weightLoss, setWeightLoss] = useState<string>('');
  const [result, setResult] = useState<FatLossResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  // Close info tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setShowInfo(false);
      }
    };

    if (showInfo) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Backend expects weekly kcal deficit; UI collects daily value
      const response = await calculateFatLoss({
        kcal_deficit: parseFloat(kcalDeficit) * 7,
        weight_loss_kg: parseFloat(weightLoss),
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setKcalDeficit('');
    setWeightLoss('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <CardSection title="Input Parameters" gradient="from-blue-500 to-emerald-600" delay="100ms">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label
                htmlFor="kcalDeficit"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Daily Calorie Deficit
              </label>
              <NumberInput
                id="kcalDeficit"
                value={kcalDeficit}
                onChange={(v) => setKcalDeficit(v)}
                step={100}
                min={0}
                placeholder="e.g., 500"
                unit="kcal/day"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                💡 Recommended: 300-500 kcal deficit for sustainable weight loss
              </p>
            </div>

            <div className="space-y-3">
              <label
                htmlFor="weightLoss"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Weekly Weight Loss
              </label>
              <NumberInput
                id="weightLoss"
                value={weightLoss}
                onChange={(v) => setWeightLoss(v)}
                step={0.1}
                min={0}
                placeholder="e.g., 0.5"
                unit="kg/week"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                💡 Healthy range: 0.2-1.0 kg per week
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 h-12 text-base font-semibold shadow-soft-lg hover:shadow-soft-xl transition-all duration-300 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner mr-3" />
                    Calculating...
                  </div>
                ) : (
                  'Calculate Composition'
                )}
              </button>

              {/* Info Button */}
              <div className="relative" ref={infoRef}>
                <button
                  type="button"
                  onClick={() => setShowInfo(!showInfo)}
                  className="btn-ghost"
                  aria-label="How it works"
                  style={{height:44, padding:'0 0.75rem', display:'inline-flex', alignItems:'center', gap:'0.375rem', flexShrink:0}}
                  title="How it works"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:16,height:16,minWidth:16}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {/* Info Popup */}
                {showInfo && (
                  <div className="popup-panel animate-scale-in" style={{position:'absolute', bottom:'100%', right:0, marginBottom:'0.5rem', width:'19rem', padding:'1rem', zIndex:20}}>
                    <h4 style={{fontWeight:700, color:'var(--fg)', marginBottom:'0.625rem', fontSize:'0.9375rem'}}>How it works</h4>
                    <div style={{fontSize:'0.8125rem', color:'var(--muted)', display:'flex', flexDirection:'column', gap:'0.375rem'}}>
                      <p>• Enter your daily calorie deficit and weekly weight loss</p>
                      <p>• The calculator estimates fat vs muscle loss ratio</p>
                      <p>• Healthy fat loss: 70%+ of weight loss from fat</p>
                      <p>• Combine with strength training for best results</p>
                      <div style={{borderTop:'1px solid var(--card-border)', margin:'0.375rem 0'}} />
                      <p><strong style={{color:'var(--fg)'}}>Formula:</strong> Simplified model based on sports science and nutrition research.</p>
                      <p><strong style={{color:'var(--fg)'}}>Sources:</strong> International Journal of Obesity, American Journal of Clinical Nutrition, Dr. Layne Norton studies.</p>
                      <p style={{fontSize:'0.75rem', fontStyle:'italic', marginTop:'0.25rem'}}>Note: Estimation only — individual results may vary.</p>
                    </div>
                    {/* Caret */}
                    <div style={{position:'absolute', top:'100%', right:'1rem', width:0, height:0, borderLeft:'6px solid transparent', borderRight:'6px solid transparent', borderTop:'6px solid var(--card-border)'}} />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="btn-ghost h-12 px-6 hover:scale-105 transition-transform duration-200"
              >
                Reset
              </button>
            </div>
          </form>
        </CardSection>

        {/* Results Display */}
        <div className="space-y-6">
          {error && <ErrorAlert error={error} />}

          {result && result.is_valid && (
            <CardSection title="Body Composition Results" gradient="from-green-500 to-emerald-600" className="animate-scale-in" delay="200ms">

              <div className="space-y-6">
                {/* Fat Loss + Muscle Loss two-column stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔥</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Fat Loss</span>
                    </div>
                    <div className="text-4xl font-bold tabular-nums" style={{ color: '#10b981' }}>
                      {result.fat_loss_percentage?.toFixed(1)}%
                    </div>
                    <div className="w-full rounded-full h-2.5" style={{ background: 'rgba(16,185,129,0.15)' }}>
                      <div className="h-2.5 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(result.fat_loss_percentage || 0, 100)}%`, background: 'linear-gradient(90deg, #10b981, #059669)' }} />
                    </div>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>from total weight loss</p>
                  </div>

                  <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.3)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💪</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Muscle Loss</span>
                    </div>
                    <div className="text-4xl font-bold tabular-nums" style={{ color: '#f97316' }}>
                      {result.muscle_loss_percentage?.toFixed(1)}%
                    </div>
                    <div className="w-full rounded-full h-2.5" style={{ background: 'rgba(249,115,22,0.15)' }}>
                      <div className="h-2.5 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(result.muscle_loss_percentage || 0, 100)}%`, background: 'linear-gradient(90deg, #f97316, #dc2626)' }} />
                    </div>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>aim to minimize this</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-xl p-4" style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📊</span>
                    <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>Summary</h3>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                    {result.fat_loss_percentage && result.fat_loss_percentage > 70
                      ? "Excellent! Most of your weight loss is coming from fat. Keep up the good work!"
                      : result.fat_loss_percentage && result.fat_loss_percentage > 50
                      ? "Good progress! Focus on maintaining muscle mass through resistance training."
                      : "Consider adjusting your approach. Strength training and adequate protein intake can help preserve muscle."
                    }
                  </p>
                </div>
              </div>
            </CardSection>
          )}

          {result && !result.is_valid && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg animate-fade-in-up">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                  Invalid calculation. Please check that your calorie deficit and weight loss values are reasonable and within healthy ranges.
                </p>
              </div>
            </div>
          )}


          {/* Visualization */}
          {result && result.is_valid && (
            <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <FatLossVisualization
                currentKcalDeficit={parseFloat(kcalDeficit)}
                currentWeightLoss={parseFloat(weightLoss)}
                currentFatLoss={result.fat_loss_percentage}
                currentMuscleLoss={result.muscle_loss_percentage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FatLossCalculator;