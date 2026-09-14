import { describe, it, expect } from 'vitest';
import { getTariff, TARIFF_2025, TARIFF_2026, TaxYear } from '../lib/local/germanTax';

describe('germanTax', () => {
  describe('getTariff', () => {
    it('returns the correct tariff for 2025', () => {
      expect(getTariff(2025)).toBe(TARIFF_2025);
    });

    it('returns the correct tariff for 2026', () => {
      expect(getTariff(2026)).toBe(TARIFF_2026);
    });

    it('falls back to 2026 tariff for unknown years', () => {
      expect(getTariff(2024 as TaxYear)).toBe(TARIFF_2026);
      expect(getTariff(2027 as TaxYear)).toBe(TARIFF_2026);
      expect(getTariff(9999 as TaxYear)).toBe(TARIFF_2026);
    });
  });
});
