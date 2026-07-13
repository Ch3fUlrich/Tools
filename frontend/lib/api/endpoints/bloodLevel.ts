import { jsonPost, authGet, withLocalFallback } from '../core';
import { getSubstancesLocal, calculateToleranceLocal } from '@/lib/local/bloodLevel';
import type {
  Substance,
  ToleranceCalculationRequest,
  ToleranceCalculationResponse
} from '../../types/api/types';

export async function getToleranceSubstances(): Promise<Substance[]> {
  return withLocalFallback(
    () => authGet<Substance[]>('/api/tools/bloodlevel/substances', 'Failed to get substances'),
    () => getSubstancesLocal()
  );
}

export async function calculateTolerance(
  req: ToleranceCalculationRequest
): Promise<ToleranceCalculationResponse> {
  return withLocalFallback(
    () => jsonPost<ToleranceCalculationResponse>(
      '/api/tools/bloodlevel/calculate',
      req,
      'Failed to calculate tolerance'
    ),
    () => calculateToleranceLocal(req)
  );
}
