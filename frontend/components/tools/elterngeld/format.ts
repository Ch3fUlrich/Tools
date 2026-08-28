// Shared German-locale formatters for the Elterngeld optimizer.

const EUR_0 = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const EUR_2 = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Normalises -0 so a zero amount never renders as "-0,00 €". */
function normalise(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Object.is(value, -0) || Math.abs(value) < 0.005 ? 0 : value;
}

/** Rounded euro amount, e.g. "13.422 €". */
export function eur(value: number): string {
  return EUR_0.format(normalise(value));
}

/** Exact euro amount, e.g. "13.421,69 €". */
export function eur2(value: number): string {
  return EUR_2.format(normalise(value));
}

/** Signed euro amount, e.g. "+2.603,93 €". */
export function eurSigned(value: number): string {
  const v = normalise(value);
  return `${v > 0 ? '+' : ''}${EUR_2.format(v)}`;
}

/** Percentage with one decimal, e.g. "67,0 %". */
export function percent(fraction: number): string {
  const safe = Number.isFinite(fraction) ? fraction : 0;
  return `${(safe * 100).toFixed(1).replace('.', ',')} %`;
}

/** Parses a user-entered number, tolerating both comma and dot decimals. */
export function parseAmount(raw: string): number {
  const value = parseFloat(String(raw).replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}
