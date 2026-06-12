// Client-side blood level calculation — mirrors backend/src/tools/bloodlevel.rs
// (same substance database, bioavailability and half-life decay model).
import type {
  Substance,
  ToleranceCalculationRequest,
  ToleranceCalculationResponse,
  BloodLevelPoint,
} from '@/lib/api/client';

interface LocalSubstance {
  id: string;
  name: string;
  halfLifeHours: number;
  description: string;
  category: string;
  commonDosageMg: number;
  maxDailyDoseMg: number;
  eliminationRoute: string;
  bioavailabilityPercent: number;
}

// Keep in sync with get_substances() in backend/src/tools/bloodlevel.rs.
const SUBSTANCES: LocalSubstance[] = [
  {
    id: 'caffeine',
    name: 'Caffeine',
    halfLifeHours: 5.7,
    description: 'Central nervous system stimulant',
    category: 'Stimulant',
    commonDosageMg: 100,
    maxDailyDoseMg: 400,
    eliminationRoute: 'Hepatic metabolism',
    bioavailabilityPercent: 99,
  },
  {
    id: 'nicotine',
    name: 'Nicotine',
    halfLifeHours: 2,
    description: 'Addictive stimulant found in tobacco',
    category: 'Stimulant',
    commonDosageMg: 1,
    maxDailyDoseMg: 4,
    eliminationRoute: 'Hepatic metabolism',
    bioavailabilityPercent: 90,
  },
  {
    id: 'alcohol',
    name: 'Alcohol (Ethanol)',
    halfLifeHours: 4,
    description: 'Depressant affecting CNS',
    category: 'Depressant',
    commonDosageMg: 14000,
    maxDailyDoseMg: 56000,
    eliminationRoute: 'Hepatic metabolism',
    bioavailabilityPercent: 100,
  },
  {
    id: 'ibuprofen',
    name: 'Ibuprofen',
    halfLifeHours: 2,
    description: 'Non-steroidal anti-inflammatory drug',
    category: 'NSAID',
    commonDosageMg: 200,
    maxDailyDoseMg: 1200,
    eliminationRoute: 'Hepatic metabolism',
    bioavailabilityPercent: 80,
  },
  {
    id: 'paracetamol',
    name: 'Acetaminophen (Paracetamol)',
    halfLifeHours: 2,
    description: 'Pain reliever and fever reducer',
    category: 'Analgesic',
    commonDosageMg: 500,
    maxDailyDoseMg: 4000,
    eliminationRoute: 'Hepatic metabolism',
    bioavailabilityPercent: 79,
  },
];

export function getSubstancesLocal(): Substance[] {
  return SUBSTANCES.map((s) => ({ ...s }));
}

function findSubstance(idOrName: string): LocalSubstance | undefined {
  const needle = idOrName.toLowerCase();
  return SUBSTANCES.find(
    (s) => s.id.toLowerCase() === needle || s.name.toLowerCase() === needle,
  );
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

    for (const timePoint of request.time_points) {
      let totalAmount = 0;
      const pointMs = Date.parse(timePoint);

      for (const intake of intakes) {
        const elapsedMs = pointMs - Date.parse(intake.time);
        if (!Number.isFinite(elapsedMs) || elapsedMs < 0) continue;

        const hoursElapsed = elapsedMs / 3_600_000;
        const bioavailableDose = intake.dosage_mg * (substance.bioavailabilityPercent / 100);
        const remaining =
          substance.halfLifeHours > 0
            ? bioavailableDose * Math.pow(0.5, hoursElapsed / substance.halfLifeHours)
            : 0;
        totalAmount += Number.isFinite(remaining) ? remaining : 0;
      }

      bloodLevels.push({
        time: timePoint,
        substance: substanceName,
        amount_mg: Number.isFinite(totalAmount) ? totalAmount : 0,
      });
    }
  }

  return { blood_levels: bloodLevels };
}
