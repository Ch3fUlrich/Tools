// Substance database for the Blood Level Calculator.
//
// Every number is a published adult-population value, not an invention. Half-lives are
// terminal elimination half-lives, Tmax values are fasted-state times to peak, and
// bioavailability is the fraction reaching systemic circulation by that route. Individual
// variation is large — caffeine's half-life alone spans roughly 2.7–9.9 h depending on
// CYP1A2 activity, smoking, pregnancy and oral contraceptives — so these describe a typical
// adult, not any particular person.
//
// Food effects follow the systematic review of immediate-release oral analgesics
// (Moore et al., Br J Clin Pharmacol 2015): food consistently delays Tmax and lowers Cmax
// while leaving total AUC largely intact, so `tmaxFactor` carries most of the effect and
// `bioavailabilityFactor` stays at 1 unless a real AUC change is documented.
//
// Mirrors get_substances() in backend/src/tools/bloodlevel.rs. A test pins the ordered id
// list so the offline fallback cannot drift from the API.

import type { SubstancePk } from './pharmacokinetics';

/** Reference adult the saturating (ethanol) parameters are scaled to. */
export const REFERENCE_BODY_WEIGHT_KG = 70;

const PUBCHEM = 'https://pubchem.ncbi.nlm.nih.gov';
const STATPEARLS = 'https://www.ncbi.nlm.nih.gov/books/';

export const SUBSTANCES: SubstancePk[] = [
  {
    id: 'caffeine',
    name: 'Caffeine',
    description: 'Central nervous system stimulant',
    category: 'Stimulant',
    halfLifeHours: 5.7,
    elimination: 'first-order',
    routes: {
      oral: { bioavailabilityPercent: 99, tmaxHours: 0.75 },
      intravenous: { bioavailabilityPercent: 100, tmaxHours: 0 },
    },
    food: { tmaxFactor: 1.5, bioavailabilityFactor: 1 },
    commonDosageMg: 100,
    maxDailyDoseMg: 400,
    eliminationRoute: 'Hepatic metabolism (CYP1A2)',
    sources: [
      `${STATPEARLS}NBK519490/ — Caffeine, StatPearls: near-complete oral bioavailability, Tmax 30–75 min, half-life 2–8 h`,
      'Blanchard & Sawers, Eur J Clin Pharmacol 1983 — absolute bioavailability of caffeine in man',
    ],
  },
  {
    id: 'nicotine',
    name: 'Nicotine',
    description: 'Addictive stimulant found in tobacco; heavy first-pass metabolism by mouth',
    category: 'Stimulant',
    halfLifeHours: 2,
    elimination: 'first-order',
    routes: {
      // Swallowed nicotine is largely destroyed first-pass, which is why gum is buccal
      // and why the inhaled and nasal routes act so much faster.
      oral: { bioavailabilityPercent: 30, tmaxHours: 1 },
      inhaled: { bioavailabilityPercent: 80, tmaxHours: 0.08 },
      nasal: { bioavailabilityPercent: 65, tmaxHours: 0.2 },
      sublingual: { bioavailabilityPercent: 50, tmaxHours: 0.5 },
      intravenous: { bioavailabilityPercent: 100, tmaxHours: 0 },
    },
    food: { tmaxFactor: 1.3, bioavailabilityFactor: 1 },
    commonDosageMg: 1,
    maxDailyDoseMg: 4,
    eliminationRoute: 'Hepatic metabolism (CYP2A6)',
    sources: [
      'Benowitz, Hukkanen & Jacob, Handb Exp Pharmacol 2009 — nicotine chemistry, metabolism and pharmacokinetics',
      `${PUBCHEM}/compound/Nicotine`,
    ],
  },
  {
    id: 'alcohol',
    name: 'Alcohol (Ethanol)',
    description:
      'Depressant. Eliminated at a near-constant rate rather than by a half-life — see the saturating model',
    category: 'Depressant',
    // Not used: elimination is saturating. Kept for display only.
    halfLifeHours: 0,
    elimination: 'saturating',
    // Vmax 8.5 g/h per 70 kg adult; Km ~80 mg/L over an ethanol Vd of ~0.6 L/kg (42 L).
    vmaxMgPerHour: 8_500,
    kmMg: 80 * 0.6 * REFERENCE_BODY_WEIGHT_KG,
    routes: {
      oral: { bioavailabilityPercent: 90, tmaxHours: 0.5 },
    },
    // Food both slows gastric emptying and increases first-pass metabolism, so unlike the
    // analgesics it genuinely lowers total exposure, not just the peak.
    food: { tmaxFactor: 2, bioavailabilityFactor: 0.8 },
    commonDosageMg: 14_000,
    maxDailyDoseMg: 56_000,
    eliminationRoute: 'Hepatic alcohol dehydrogenase (saturable)',
    sources: [
      'Holford, Clin Pharmacokinet 1987 — clinical pharmacokinetics of ethanol: Vmax 8.5 g/h/70 kg, Km ~80 mg/L',
      'Wagner et al., J Pharmacokinet Biopharm 1976 — Michaelis-Menten elimination of ethanol',
      'Widmark 1932 — zero-order approximation, beta ~0.15 g/L/h',
    ],
  },
  {
    id: 'ibuprofen',
    name: 'Ibuprofen',
    description: 'Non-steroidal anti-inflammatory drug',
    category: 'NSAID',
    halfLifeHours: 2,
    elimination: 'first-order',
    routes: {
      oral: { bioavailabilityPercent: 90, tmaxHours: 1 },
      intravenous: { bioavailabilityPercent: 100, tmaxHours: 0 },
    },
    // Fed Tmax runs 1.3–2.8x fasted; Cmax drops to 44–85 % while AUC is preserved.
    food: { tmaxFactor: 2, bioavailabilityFactor: 1 },
    commonDosageMg: 400,
    maxDailyDoseMg: 1_200,
    eliminationRoute: 'Hepatic metabolism (CYP2C9)',
    sources: [
      'Moore et al., Br J Clin Pharmacol 2015 — food effects on immediate-release analgesics: fed Tmax 1.30–2.80x fasted',
      'Davies, Clin Pharmacokinet 1998 — clinical pharmacokinetics of ibuprofen',
    ],
  },
  {
    id: 'paracetamol',
    name: 'Acetaminophen (Paracetamol)',
    description: 'Pain reliever and fever reducer',
    category: 'Analgesic',
    halfLifeHours: 2.3,
    elimination: 'first-order',
    routes: {
      oral: { bioavailabilityPercent: 88, tmaxHours: 0.75 },
      intravenous: { bioavailabilityPercent: 100, tmaxHours: 0 },
    },
    food: { tmaxFactor: 2, bioavailabilityFactor: 1 },
    commonDosageMg: 500,
    maxDailyDoseMg: 4_000,
    eliminationRoute: 'Hepatic conjugation',
    sources: [
      'Forrest, Clements & Prescott, Clin Pharmacokinet 1982 — clinical pharmacokinetics of paracetamol',
      'Moore et al., Br J Clin Pharmacol 2015 — food delays paracetamol Tmax substantially',
    ],
  },
  {
    id: 'theobromine',
    name: 'Theobromine',
    description: 'Cocoa alkaloid, milder relative of caffeine',
    category: 'Stimulant',
    halfLifeHours: 7.2,
    elimination: 'first-order',
    routes: { oral: { bioavailabilityPercent: 77, tmaxHours: 2 } },
    food: { tmaxFactor: 1.5, bioavailabilityFactor: 1 },
    commonDosageMg: 200,
    maxDailyDoseMg: 1_000,
    eliminationRoute: 'Hepatic metabolism',
    sources: ['Martinez-Pinilla et al., Front Pharmacol 2015 — theobromine pharmacology and kinetics'],
  },
  {
    id: 'naproxen',
    name: 'Naproxen',
    description: 'Long-acting NSAID; the long half-life is why it is dosed twice daily',
    category: 'NSAID',
    halfLifeHours: 14,
    elimination: 'first-order',
    routes: { oral: { bioavailabilityPercent: 95, tmaxHours: 2 } },
    food: { tmaxFactor: 1.8, bioavailabilityFactor: 1 },
    commonDosageMg: 250,
    maxDailyDoseMg: 1_000,
    eliminationRoute: 'Hepatic metabolism',
    sources: ['Davies & Anderson, Clin Pharmacokinet 1997 — clinical pharmacokinetics of naproxen'],
  },
  {
    id: 'aspirin',
    name: 'Aspirin (as salicylate)',
    description: 'Measured as salicylate: aspirin itself is hydrolysed within minutes',
    category: 'NSAID',
    halfLifeHours: 3,
    elimination: 'first-order',
    routes: { oral: { bioavailabilityPercent: 68, tmaxHours: 1 } },
    food: { tmaxFactor: 2, bioavailabilityFactor: 1 },
    commonDosageMg: 500,
    maxDailyDoseMg: 3_000,
    eliminationRoute: 'Hepatic and renal (dose-dependent)',
    sources: [
      'Needs & Brooks, Clin Pharmacokinet 1985 — clinical pharmacokinetics of the salicylates',
      'Moore et al., Br J Clin Pharmacol 2015 — food effects on aspirin',
    ],
  },
  {
    id: 'diphenhydramine',
    name: 'Diphenhydramine',
    description: 'Sedating antihistamine; heavy first-pass metabolism',
    category: 'Antihistamine',
    halfLifeHours: 8.5,
    elimination: 'first-order',
    routes: {
      oral: { bioavailabilityPercent: 43, tmaxHours: 2 },
      intravenous: { bioavailabilityPercent: 100, tmaxHours: 0 },
    },
    food: { tmaxFactor: 1.3, bioavailabilityFactor: 1 },
    commonDosageMg: 25,
    maxDailyDoseMg: 150,
    eliminationRoute: 'Hepatic metabolism (CYP2D6)',
    sources: ['Paton & Webster, Clin Pharmacokinet 1985 — pharmacokinetics of H1-receptor antagonists'],
  },
  {
    id: 'cetirizine',
    name: 'Cetirizine',
    description: 'Non-sedating antihistamine, largely excreted unchanged',
    category: 'Antihistamine',
    halfLifeHours: 8.3,
    elimination: 'first-order',
    routes: { oral: { bioavailabilityPercent: 70, tmaxHours: 1 } },
    food: { tmaxFactor: 1.7, bioavailabilityFactor: 1 },
    commonDosageMg: 10,
    maxDailyDoseMg: 10,
    eliminationRoute: 'Renal excretion',
    sources: ['Chen, Clin Pharmacokinet 2008 — physicochemical properties and pharmacokinetics of cetirizine'],
  },
  {
    id: 'loratadine',
    name: 'Loratadine',
    description: 'Non-sedating antihistamine; its active metabolite lasts far longer than the parent',
    category: 'Antihistamine',
    halfLifeHours: 8.4,
    elimination: 'first-order',
    routes: { oral: { bioavailabilityPercent: 40, tmaxHours: 1.3 } },
    food: { tmaxFactor: 1.5, bioavailabilityFactor: 1 },
    commonDosageMg: 10,
    maxDailyDoseMg: 10,
    eliminationRoute: 'Hepatic metabolism (CYP3A4/2D6)',
    sources: ['Haria, Fitton & Peters, Drugs 1994 — loratadine pharmacokinetics review'],
  },
  {
    id: 'melatonin',
    name: 'Melatonin',
    description: 'Very short half-life and low oral bioavailability',
    category: 'Hormone',
    halfLifeHours: 0.75,
    elimination: 'first-order',
    routes: { oral: { bioavailabilityPercent: 15, tmaxHours: 0.75 } },
    food: { tmaxFactor: 1.5, bioavailabilityFactor: 1 },
    commonDosageMg: 3,
    maxDailyDoseMg: 10,
    eliminationRoute: 'Hepatic metabolism (CYP1A2)',
    sources: ['DeMuro et al., J Clin Pharmacol 2000 — absolute bioavailability of oral melatonin'],
  },
  {
    id: 'pseudoephedrine',
    name: 'Pseudoephedrine',
    description: 'Decongestant; clearance is faster when urine is acidic',
    category: 'Decongestant',
    halfLifeHours: 5.5,
    elimination: 'first-order',
    routes: { oral: { bioavailabilityPercent: 90, tmaxHours: 2 } },
    food: { tmaxFactor: 1.5, bioavailabilityFactor: 1 },
    commonDosageMg: 60,
    maxDailyDoseMg: 240,
    eliminationRoute: 'Renal excretion',
    sources: ['Kanfer, Dowse & Vuma, J Clin Pharmacol 1993 — pharmacokinetics of oral decongestants'],
  },
  {
    id: 'amoxicillin',
    name: 'Amoxicillin',
    description: 'Beta-lactam antibiotic cleared quickly by the kidneys',
    category: 'Antibiotic',
    halfLifeHours: 1.1,
    elimination: 'first-order',
    routes: {
      oral: { bioavailabilityPercent: 80, tmaxHours: 1.5 },
      intravenous: { bioavailabilityPercent: 100, tmaxHours: 0 },
    },
    food: { tmaxFactor: 1.3, bioavailabilityFactor: 0.9 },
    commonDosageMg: 500,
    maxDailyDoseMg: 3_000,
    eliminationRoute: 'Renal excretion',
    sources: ['Spyker et al., Antimicrob Agents Chemother 1977 — amoxicillin dose dependence and bioavailability'],
  },
  {
    id: 'metformin',
    name: 'Metformin',
    description: 'Antidiabetic excreted unchanged; accumulates if renal function is poor',
    category: 'Antidiabetic',
    halfLifeHours: 6.2,
    elimination: 'first-order',
    routes: { oral: { bioavailabilityPercent: 55, tmaxHours: 2.5 } },
    food: { tmaxFactor: 1.4, bioavailabilityFactor: 0.9 },
    commonDosageMg: 500,
    maxDailyDoseMg: 2_000,
    eliminationRoute: 'Renal excretion',
    sources: ['Graham et al., Clin Pharmacokinet 2011 — clinical pharmacokinetics of metformin'],
  },
  {
    id: 'omeprazole',
    name: 'Omeprazole',
    description: 'Proton-pump inhibitor; its effect long outlasts its plasma half-life',
    category: 'Proton-pump inhibitor',
    halfLifeHours: 1,
    elimination: 'first-order',
    routes: {
      oral: { bioavailabilityPercent: 40, tmaxHours: 2 },
      intravenous: { bioavailabilityPercent: 100, tmaxHours: 0 },
    },
    // One of the few where food genuinely cuts exposure, hence the dose-before-breakfast advice.
    food: { tmaxFactor: 2, bioavailabilityFactor: 0.5 },
    commonDosageMg: 20,
    maxDailyDoseMg: 40,
    eliminationRoute: 'Hepatic metabolism (CYP2C19)',
    sources: ['Andersson, Clin Pharmacokinet 1996 — pharmacokinetics of proton pump inhibitors'],
  },
  {
    id: 'sertraline',
    name: 'Sertraline',
    description: 'SSRI; the long half-life is why steady state takes about a week',
    category: 'SSRI',
    halfLifeHours: 26,
    elimination: 'first-order',
    routes: { oral: { bioavailabilityPercent: 44, tmaxHours: 6 } },
    food: { tmaxFactor: 1.2, bioavailabilityFactor: 1 },
    commonDosageMg: 50,
    maxDailyDoseMg: 200,
    eliminationRoute: 'Hepatic metabolism',
    sources: ['DeVane, Liston & Markowitz, Clin Pharmacokinet 2002 — sertraline pharmacokinetics'],
  },
];

export function findSubstance(idOrName: string): SubstancePk | undefined {
  const needle = idOrName.toLowerCase();
  return SUBSTANCES.find((s) => s.id.toLowerCase() === needle || s.name.toLowerCase() === needle);
}
