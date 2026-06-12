// Client-side fat loss calculation — mirrors backend/src/tools/fat_loss.rs
// so results are identical with or without a backend.
import type { FatLossRequest, FatLossResponse } from '@/lib/api/client';

const KCAL_PER_KG_FAT = 7000;
const KCAL_PER_KG_MUSCLE = 1200;

export function calculateFatLossLocal(request: FatLossRequest): FatLossResponse {
  const { kcal_deficit, weight_loss_kg } = request;

  if (!(kcal_deficit > 0) || !(weight_loss_kg > 0)) {
    return { fat_loss_percentage: null, muscle_loss_percentage: null, is_valid: false };
  }

  const fatFraction =
    (kcal_deficit - KCAL_PER_KG_MUSCLE * weight_loss_kg) /
    (KCAL_PER_KG_FAT - KCAL_PER_KG_MUSCLE) /
    weight_loss_kg;

  if (!(fatFraction >= 0 && fatFraction <= 1)) {
    return { fat_loss_percentage: null, muscle_loss_percentage: null, is_valid: false };
  }

  return {
    fat_loss_percentage: fatFraction * 100,
    muscle_loss_percentage: (1 - fatFraction) * 100,
    is_valid: true,
  };
}
