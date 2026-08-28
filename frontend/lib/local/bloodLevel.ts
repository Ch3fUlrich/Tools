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
    description: 'Depressant affecting CNS. Approximate only — ethanol is eliminated at a near-constant rate (zero order), not by a fixed half-life',
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
  {
    id: 'theobromine',
    name: 'Theobromine',
    halfLifeHours: 7.2,
    description: 'Cocoa alkaloid, milder relative of caffeine',
    category: 'Stimulant',
    commonDosageMg: 200.0,
    maxDailyDoseMg: 1000.0,
    eliminationRoute: 'Hepatic metabolism',
    bioavailabilityPercent: 77.0,
  },
  {
    id: 'naproxen',
    name: 'Naproxen',
    halfLifeHours: 14.0,
    description: 'Long-acting NSAID; the long half-life is why it is dosed twice daily',
    category: 'NSAID',
    commonDosageMg: 250.0,
    maxDailyDoseMg: 1000.0,
    eliminationRoute: 'Hepatic metabolism',
    bioavailabilityPercent: 95.0,
  },
  {
    id: 'aspirin',
    name: 'Aspirin (as salicylate)',
    halfLifeHours: 3.0,
    description: 'Measured as salicylate: aspirin itself is hydrolysed within minutes',
    category: 'NSAID',
    commonDosageMg: 500.0,
    maxDailyDoseMg: 3000.0,
    eliminationRoute: 'Hepatic and renal',
    bioavailabilityPercent: 68.0,
  },
  {
    id: 'diphenhydramine',
    name: 'Diphenhydramine',
    halfLifeHours: 8.5,
    description: 'Sedating antihistamine; heavy first-pass metabolism',
    category: 'Antihistamine',
    commonDosageMg: 25.0,
    maxDailyDoseMg: 150.0,
    eliminationRoute: 'Hepatic metabolism (CYP2D6)',
    bioavailabilityPercent: 43.0,
  },
  {
    id: 'cetirizine',
    name: 'Cetirizine',
    halfLifeHours: 8.3,
    description: 'Non-sedating antihistamine, largely excreted unchanged',
    category: 'Antihistamine',
    commonDosageMg: 10.0,
    maxDailyDoseMg: 10.0,
    eliminationRoute: 'Renal excretion',
    bioavailabilityPercent: 70.0,
  },
  {
    id: 'loratadine',
    name: 'Loratadine',
    halfLifeHours: 8.4,
    description: 'Non-sedating antihistamine; its active metabolite lasts far longer than the parent',
    category: 'Antihistamine',
    commonDosageMg: 10.0,
    maxDailyDoseMg: 10.0,
    eliminationRoute: 'Hepatic metabolism (CYP3A4/2D6)',
    bioavailabilityPercent: 40.0,
  },
  {
    id: 'melatonin',
    name: 'Melatonin',
    halfLifeHours: 0.75,
    description: 'Very short half-life and low oral bioavailability',
    category: 'Hormone',
    commonDosageMg: 3.0,
    maxDailyDoseMg: 10.0,
    eliminationRoute: 'Hepatic metabolism (CYP1A2)',
    bioavailabilityPercent: 15.0,
  },
  {
    id: 'pseudoephedrine',
    name: 'Pseudoephedrine',
    halfLifeHours: 5.5,
    description: 'Decongestant; clearance is faster when urine is acidic',
    category: 'Decongestant',
    commonDosageMg: 60.0,
    maxDailyDoseMg: 240.0,
    eliminationRoute: 'Renal excretion',
    bioavailabilityPercent: 90.0,
  },
  {
    id: 'amoxicillin',
    name: 'Amoxicillin',
    halfLifeHours: 1.1,
    description: 'Beta-lactam antibiotic cleared quickly by the kidneys',
    category: 'Antibiotic',
    commonDosageMg: 500.0,
    maxDailyDoseMg: 3000.0,
    eliminationRoute: 'Renal excretion',
    bioavailabilityPercent: 80.0,
  },
  {
    id: 'metformin',
    name: 'Metformin',
    halfLifeHours: 6.2,
    description: 'Antidiabetic excreted unchanged; accumulates if renal function is poor',
    category: 'Antidiabetic',
    commonDosageMg: 500.0,
    maxDailyDoseMg: 2000.0,
    eliminationRoute: 'Renal excretion',
    bioavailabilityPercent: 55.0,
  },
  {
    id: 'omeprazole',
    name: 'Omeprazole',
    halfLifeHours: 1.0,
    description: 'Proton-pump inhibitor; its effect long outlasts its plasma half-life',
    category: 'Proton-pump inhibitor',
    commonDosageMg: 20.0,
    maxDailyDoseMg: 40.0,
    eliminationRoute: 'Hepatic metabolism (CYP2C19)',
    bioavailabilityPercent: 40.0,
  },
  {
    id: 'sertraline',
    name: 'Sertraline',
    halfLifeHours: 26.0,
    description: 'SSRI; the long half-life is why steady state takes about a week',
    category: 'SSRI',
    commonDosageMg: 50.0,
    maxDailyDoseMg: 200.0,
    eliminationRoute: 'Hepatic metabolism',
    bioavailabilityPercent: 44.0,
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

    const parsedIntakes = intakes.map((intake) => ({
      timeMs: Date.parse(intake.time),
      bioavailableDose: intake.dosage_mg * (substance.bioavailabilityPercent / 100),
    }));

    for (const timePoint of request.time_points) {
      let totalAmount = 0;
      const pointMs = Date.parse(timePoint);

      for (const parsedIntake of parsedIntakes) {
        const elapsedMs = pointMs - parsedIntake.timeMs;
        if (!Number.isFinite(elapsedMs) || elapsedMs < 0) continue;

        const hoursElapsed = elapsedMs / 3_600_000;
        const remaining =
          substance.halfLifeHours > 0
            ? parsedIntake.bioavailableDose * Math.pow(0.5, hoursElapsed / substance.halfLifeHours)
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
