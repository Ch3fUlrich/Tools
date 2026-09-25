import React from 'react';
import CardSection from '@/components/ui/CardSection';
import LineChart from '../../charts/LineChart';
import { BloodLevelPoint, Substance } from '@/lib/api/client';

interface ResultsPanelProps {
  bloodLevels: BloodLevelPoint[];
  substances: Substance[];
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  bloodLevels,
  substances,
}) => {
  const substanceDisplayName = (idOrName: string) =>
    substances.find((s) => s.id === idOrName)?.name ?? idOrName;

  return (
    <CardSection
      title="Blood Level Graph"
      gradient="from-blue-500 to-indigo-600"
      delay="200ms"
    >
      {bloodLevels.length > 0 ? (
        <div className="space-y-6">
          {Array.from(new Set(bloodLevels.map((bl) => bl.substance))).map(
            (substance) => {
              const substanceData = bloodLevels
                .filter((bl) => bl.substance === substance)
                .map((bl) => ({
                  time: bl.time,
                  value: bl.amount_mg,
                }));

              return (
                <div key={substance} className="space-y-3">
                  <h3
                    className="text-lg font-medium"
                    style={{ color: 'var(--fg)' }}
                  >
                    {substanceDisplayName(substance)} Blood Levels
                  </h3>
                  <LineChart
                    data={substanceData}
                    width={400}
                    height={200}
                    color="#3b82f6"
                    className="bloodlevel-chart"
                  />
                </div>
              );
            }
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {Array.from(new Set(bloodLevels.map((bl) => bl.substance))).map(
              (substance) => {
                const substanceLevels = bloodLevels.filter(
                  (bl) => bl.substance === substance
                );
                const maxLevel = Math.max(
                  ...substanceLevels.map((bl) => bl.amount_mg)
                );
                const currentLevel =
                  substanceLevels[substanceLevels.length - 1]?.amount_mg || 0;

                return (
                  <div
                    key={substance}
                    className="rounded-xl p-4"
                    style={{
                      background: 'rgba(59,130,246,0.10)',
                      border: '1px solid rgba(59,130,246,0.3)',
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className="font-medium"
                        style={{ color: 'var(--fg)' }}
                      >
                        {substanceDisplayName(substance)}
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: '#3b82f6' }}
                      >
                        Now: {currentLevel.toFixed(2)} mg
                      </span>
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: 'var(--muted)' }}
                    >
                      Peak: {maxLevel.toFixed(2)} mg
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      ) : (
        <div
          className="bloodlevel-empty-state rounded-xl p-12 flex items-center justify-center"
          style={{ background: 'var(--input-bg)' }}
        >
          <div className="text-center">
            <span className="text-5xl mb-4 block">📊</span>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Add substance intakes above and calculate to see blood level
              graphs
            </p>
          </div>
        </div>
      )}
    </CardSection>
  );
};

export default ResultsPanel;
