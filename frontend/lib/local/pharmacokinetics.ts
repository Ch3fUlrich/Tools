// Pharmacokinetic model and substance database for the Blood Level Calculator.
//
// Mirrors backend/src/tools/bloodlevel.rs — keep both in sync, a test pins the ids.
//
// The tool used to treat every dose as an instantaneous IV bolus decaying by half-life.
// That has no absorption phase, so immediately after an oral dose it showed a peak the
// body has not reached yet. This module models absorption explicitly and lets the route
// and the fed/fasted state change it, which is what those columns in the intake table
// were always collecting but never using.
//
// Two elimination kinds are supported:
//   first-order  — the usual case, an analytic Bateman solution
//   saturating   — ethanol, which does not have a half-life at all (see below)

export type Route = 'oral' | 'intravenous' | 'nasal' | 'inhaled' | 'sublingual';

export const ROUTES: Route[] = ['oral', 'intravenous', 'nasal', 'inhaled', 'sublingual'];

export interface RouteParams {
  /** Fraction of the dose reaching systemic circulation, in percent. */
  bioavailabilityPercent: number;
  /**
   * Published time to peak concentration in the fasted state, in hours.
   * 0 means the dose is placed directly in the blood (intravenous) — no absorption phase.
   * Tmax is what the literature actually reports, so the database stores it and the
   * absorption rate constant is solved from it (see `absorptionRateFromTmax`).
   */
  tmaxHours: number;
}

export interface FoodEffect {
  /** Food delays gastric emptying: Tmax multiplier when taken with or just after a meal. */
  tmaxFactor: number;
  /** Multiplier on bioavailability with food. 1 means AUC is unaffected. */
  bioavailabilityFactor: number;
}

export interface SubstancePk {
  id: string;
  name: string;
  description: string;
  category: string;
  /** Terminal elimination half-life in hours. Meaningless for saturating elimination. */
  halfLifeHours: number;
  elimination: 'first-order' | 'saturating';
  /**
   * Michaelis-Menten parameters, saturating elimination only, for a 70 kg adult.
   * vmaxMgPerHour: maximum metabolic rate. kmMg: amount in the body at which the rate is
   * half of vmax.
   */
  vmaxMgPerHour?: number;
  kmMg?: number;
  routes: Partial<Record<Route, RouteParams>>;
  food: FoodEffect;
  commonDosageMg: number;
  maxDailyDoseMg: number;
  eliminationRoute: string;
  /** Where the numbers above come from. */
  sources: string[];
}

const LN2 = Math.LN2;

// ─────────────────────────────────────────────────────────────────────────────
// Model
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Absorption rate constant implied by a published Tmax.
 *
 * For a one-compartment model with first-order absorption,
 *   Tmax = ln(ka / ke) / (ka − ke)
 * which cannot be inverted in closed form, so solve it numerically. Tmax falls
 * monotonically as ka rises, which makes bisection safe and quick.
 */
export function absorptionRateFromTmax(tmaxHours: number, ke: number): number {
  if (!(tmaxHours > 0) || !(ke > 0)) return Number.POSITIVE_INFINITY;

  const tmaxFor = (ka: number) => (Math.abs(ka - ke) < 1e-9 ? 1 / ke : Math.log(ka / ke) / (ka - ke));

  // ka must exceed ke for a peak to exist at all.
  let low = ke * 1.000001;
  let high = Math.max(ke * 10, 1);
  // Grow the upper bound until its Tmax is below the target.
  for (let i = 0; i < 200 && tmaxFor(high) > tmaxHours; i += 1) high *= 2;

  for (let i = 0; i < 200; i += 1) {
    const mid = (low + high) / 2;
    if (tmaxFor(mid) > tmaxHours) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/**
 * Amount in the body from a single dose, one compartment, first-order in and out.
 *
 *   A(t) = F·D · ka/(ka − ke) · (e^(−ke·t) − e^(−ka·t))
 *
 * With ka → ∞ (intravenous) this collapses to the plain decay F·D·e^(−ke·t), which is
 * what the tool did for every route before.
 */
export function amountFirstOrder(
  bioavailableDose: number,
  ka: number,
  ke: number,
  hoursSinceDose: number,
): number {
  if (hoursSinceDose < 0) return 0;
  if (!Number.isFinite(ka)) return bioavailableDose * Math.exp(-ke * hoursSinceDose);

  // ka == ke is a removable singularity: A(t) = F·D·ka·t·e^(−ka·t)
  if (Math.abs(ka - ke) < 1e-9) {
    return bioavailableDose * ka * hoursSinceDose * Math.exp(-ka * hoursSinceDose);
  }

  const value =
    ((bioavailableDose * ka) / (ka - ke)) *
    (Math.exp(-ke * hoursSinceDose) - Math.exp(-ka * hoursSinceDose));
  return value > 0 ? value : 0;
}

export interface SaturatingDose {
  /** Hours from the start of the simulation window. */
  hoursFromStart: number;
  bioavailableDose: number;
  ka: number;
}

/**
 * Ethanol. It has no half-life: alcohol dehydrogenase saturates at concentrations well
 * below those of a single drink, so elimination runs at a near-constant rate. Modelled as
 * Michaelis-Menten, which is zero-order while the amount is well above Km and degrades
 * gracefully to first-order as it approaches zero — avoiding the negative amounts a plain
 * constant-rate model produces at the tail.
 *
 *   dG/dt = −ka·G                       (gut)
 *   dA/dt =  ka·G − Vmax·A/(Km + A)     (body)
 *
 * Doses do not superimpose here — the elimination term is non-linear — so the whole
 * timeline is integrated once with every dose in it, rather than summed dose by dose.
 * Midpoint (RK2) steps keep the error far below the precision the inputs deserve.
 */
export function simulateSaturating(
  doses: SaturatingDose[],
  vmaxMgPerHour: number,
  kmMg: number,
  sampleHours: number[],
  stepHours = 0.01,
): number[] {
  const horizon = Math.max(0, ...sampleHours, ...doses.map((d) => d.hoursFromStart));
  const steps = Math.max(1, Math.ceil(horizon / stepHours));

  const gut = doses.map(() => 0);
  let body = 0;
  let released = doses.map(() => false);

  const rate = (amount: number) => (amount > 0 ? (vmaxMgPerHour * amount) / (kmMg + amount) : 0);

  // Sample requests, sorted so the walk can emit them in order.
  const order = sampleHours.map((h, i) => ({ h, i })).sort((a, b) => a.h - b.h);
  const out = new Array<number>(sampleHours.length).fill(0);
  let next = 0;

  const emitUpTo = (t: number) => {
    while (next < order.length && order[next].h <= t + 1e-12) {
      out[order[next].i] = body > 0 ? body : 0;
      next += 1;
    }
  };

  emitUpTo(0);

  for (let step = 0; step < steps; step += 1) {
    const t = step * stepHours;

    // A dose enters the gut the moment it is taken.
    doses.forEach((dose, i) => {
      if (!released[i] && dose.hoursFromStart <= t + 1e-12) {
        gut[i] += dose.bioavailableDose;
        released = released.map((r, j) => (j === i ? true : r));
      }
    });

    // Midpoint step for the body; the gut decays analytically over the step.
    let absorbed = 0;
    doses.forEach((dose, i) => {
      if (gut[i] <= 0) return;
      const remaining = Number.isFinite(dose.ka) ? gut[i] * Math.exp(-dose.ka * stepHours) : 0;
      absorbed += gut[i] - remaining;
      gut[i] = remaining;
    });

    const halfBody = body + (absorbed / 2 - (rate(body) * stepHours) / 2);
    body = body + absorbed - rate(halfBody > 0 ? halfBody : 0) * stepHours;
    if (body < 0) body = 0;

    emitUpTo(t + stepHours);
  }

  emitUpTo(Number.POSITIVE_INFINITY);
  return out;
}

/** Elimination rate constant from a half-life. */
export function eliminationRate(halfLifeHours: number): number {
  return halfLifeHours > 0 ? LN2 / halfLifeHours : 0;
}

/**
 * Effective route parameters after the fed/fasted adjustment.
 * An unsupported route falls back to oral, which is flagged rather than hidden.
 */
export function resolveRoute(
  substance: SubstancePk,
  route: Route,
  withFood: boolean,
): { params: RouteParams; usedRoute: Route; substituted: boolean } {
  const direct = substance.routes[route];
  const params = direct ?? substance.routes.oral;
  const usedRoute: Route = direct ? route : 'oral';
  if (!params) {
    return {
      params: { bioavailabilityPercent: 100, tmaxHours: 0 },
      usedRoute: 'intravenous',
      substituted: true,
    };
  }

  // Food only matters where there is an absorption phase to delay.
  const applyFood = withFood && params.tmaxHours > 0;
  return {
    params: {
      bioavailabilityPercent:
        params.bioavailabilityPercent * (applyFood ? substance.food.bioavailabilityFactor : 1),
      tmaxHours: params.tmaxHours * (applyFood ? substance.food.tmaxFactor : 1),
    },
    usedRoute,
    substituted: !direct,
  };
}
