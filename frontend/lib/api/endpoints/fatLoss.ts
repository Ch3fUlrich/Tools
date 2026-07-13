import { jsonPost, withLocalFallback } from '../core';
import { calculateFatLossLocal } from '@/lib/local/fatLoss';
import type { FatLossRequest, FatLossResponse } from '../../types/api/types';

export async function calculateFatLoss(
  req: FatLossRequest
): Promise<FatLossResponse> {
  // Extract values, preferring snake_case for backwards compatibility if both exist.
  // Then form the final request strictly as expected by the local/backend.
  const resolvedReq: FatLossRequest = {
    kcal_deficit: req.kcal_deficit ?? req.calorieDeficit,
    weight_loss_kg: req.weight_loss_kg ?? req.weightLossKg,
  };

  return withLocalFallback(
    () => jsonPost<FatLossResponse>('/api/tools/fat-loss', resolvedReq, 'Failed to calculate fat loss'),
    () => calculateFatLossLocal(resolvedReq)
  );
}
