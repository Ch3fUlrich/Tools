import { jsonPost, withLocalFallback } from '../core';
import { analyzeN26DataLocal } from '@/lib/local/n26';
import type { AnalysisResult } from '../../types/api/types';

export async function analyzeN26Data(data: Record<string, unknown>): Promise<AnalysisResult> {
  return withLocalFallback(
    () => jsonPost<AnalysisResult>('/api/tools/n26-analyzer', data, 'Failed to analyze N26 data'),
    () => analyzeN26DataLocal(data)
  );
}
