// Client-side blood level calculation — mirrors backend/src/tools/bloodlevel.rs.
//
// The substance data and the pharmacokinetic model live in their own modules; this file is
// only the adapter between them and the API shape.
import type {
  Substance,
  ToleranceCalculationRequest,
  ToleranceCalculationResponse,
  BloodLevelPoint,
} from '@/lib/api/client';
import {
  absorptionRateFromTmax,
  amountFirstOrder,
  eliminationRate,
  resolveRoute,
  type Route,
  type SaturatingDose,
  simulateSaturating,
} from './pharmacokinetics';
import { SUBSTANCES, findSubstance } from './substanceDatabase';

const DEFAULT_ROUTE: Route = 'oral';

function asRoute(value: string | undefined): Route {
  switch (value) {
    case 'intravenous':
    case 'nasal':
    case 'inhaled':
    case 'sublingual':
    case 'oral':
      return value;
    default:
      return DEFAULT_ROUTE;
  }
}

/**
 * The UI still wants the flat shape it always had, so the oral route stands in for the
 * headline bioavailability. The full per-route detail is in `substanceDatabase.ts`.
 */
export function getSubstancesLocal(): Substance[] {
  return SUBSTANCES.map((s) => ({
    id: s.id,
    name: s.name,
    halfLifeHours: s.halfLifeHours,
    description: s.description,
    category: s.category,
    commonDosageMg: s.commonDosageMg,
    maxDailyDoseMg: s.maxDailyDoseMg,
    eliminationRoute: s.eliminationRoute,
    bioavailabilityPercent:
      s.routes.oral?.bioavailabilityPercent ?? s.routes.intravenous?.bioavailabilityPercent ?? 100,
  }));
}

export function calculateToleranceLocal(
  request: ToleranceCalculationRequest,
): ToleranceCalculationResponse {
  const bloodLevels: BloodLevelPoint[] = [];

  // Group intakes by substance, like the backend does.
  const bySubstance = new Map<string, typeof request.intakes>();
  for (const intake of request.intakes) {
    const group = bySubstance.get(intake.substance) ?? [];
    group.push(intake);
    bySubstance.set(intake.substance, group);
  }

  for (const [substanceName, intakes] of bySubstance) {
    const substance = findSubstance(substanceName);
    if (!substance) {
      throw new Error(`Substance '${substanceName}' not found in database`);
    }

    const sampleMs = request.time_points.map((t) => Date.parse(t));

    const doses = intakes.map((intake) => {
      const { params } = resolveRoute(substance, asRoute(intake.route), Boolean(intake.with_food));
      const ke = eliminationRate(substance.halfLifeHours);
      return {
        timeMs: Date.parse(intake.time),
        bioavailableDose: intake.dosage_mg * (params.bioavailabilityPercent / 100),
        // Intravenous doses have tmax 0, which yields an infinite ka: no absorption phase.
        ka: absorptionRateFromTmax(params.tmaxHours, ke > 0 ? ke : 1),
      };
    });

    if (substance.elimination === 'saturating') {
      // Non-linear elimination does not superimpose, so integrate the whole timeline once
      // with every dose in it rather than summing dose by dose.
      const originMs = Math.min(...doses.map((d) => d.timeMs), ...sampleMs);
      const toHours = (ms: number) => (ms - originMs) / 3_600_000;

      const saturatingDoses: SaturatingDose[] = doses.map((d) => ({
        hoursFromStart: toHours(d.timeMs),
        bioavailableDose: d.bioavailableDose,
        ka: d.ka,
      }));

      const amounts = simulateSaturating(
        saturatingDoses,
        substance.vmaxMgPerHour ?? 0,
        substance.kmMg ?? 1,
        sampleMs.map(toHours),
      );

      request.time_points.forEach((timePoint, i) => {
        bloodLevels.push({
          time: timePoint,
          substance: substanceName,
          amount_mg: Number.isFinite(amounts[i]) ? amounts[i] : 0,
        });
      });
      continue;
    }

    const ke = eliminationRate(substance.halfLifeHours);
    request.time_points.forEach((timePoint, i) => {
      let totalAmount = 0;
      for (const dose of doses) {
        const hoursElapsed = (sampleMs[i] - dose.timeMs) / 3_600_000;
        if (!Number.isFinite(hoursElapsed) || hoursElapsed < 0) continue;
        const remaining = ke > 0 ? amountFirstOrder(dose.bioavailableDose, dose.ka, ke, hoursElapsed) : 0;
        totalAmount += Number.isFinite(remaining) ? remaining : 0;
      }
      bloodLevels.push({
        time: timePoint,
        substance: substanceName,
        amount_mg: Number.isFinite(totalAmount) ? totalAmount : 0,
      });
    });
  }

  return { blood_levels: bloodLevels };
}
