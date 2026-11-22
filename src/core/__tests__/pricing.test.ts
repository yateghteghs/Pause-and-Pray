import { formatNaira, PARISH_TIERS, PLUS_PRICES, PRICE_RULES, yearlyCost, yearlySaving } from '../pricing';

describe('pricing rules', () => {
  const all = [
    ...PLUS_PRICES.map((p) => ({ id: p.id, naira: p.naira, perYear: yearlyCost(p.naira, p.period) })),
    ...PARISH_TIERS.map((t) => ({ id: t.id, naira: t.naira, perYear: t.naira })),
  ];

  test.each(all)('$id costs at least ₦400', ({ naira }) => {
    expect(naira).toBeGreaterThanOrEqual(PRICE_RULES.minNaira);
  });

  test.each(all)('$id costs no more than ₦10,000 a year', ({ perYear }) => {
    expect(perYear).toBeLessThanOrEqual(PRICE_RULES.maxNairaPerYear);
  });

  test('the cheapest option is exactly ₦400 and the dearest exactly ₦10,000 a year', () => {
    expect(Math.min(...all.map((a) => a.naira))).toBe(400);
    expect(Math.max(...all.map((a) => a.perYear))).toBe(10_000);
  });

  test('yearly Plus is cheaper than twelve months', () => {
    expect(yearlySaving()).toBe(27);
  });

  test('parish tiers grow in price and in reach', () => {
    for (let i = 1; i < PARISH_TIERS.length; i++) {
      const [a, b] = [PARISH_TIERS[i - 1], PARISH_TIERS[i]];
      expect(b.naira).toBeGreaterThan(a.naira);
      expect(b.maxMembers ?? Infinity).toBeGreaterThan(a.maxMembers ?? 0);
    }
  });

  test('naira formatting', () => {
    expect(formatNaira(10000)).toBe('₦10,000');
    expect(formatNaira(400)).toBe('₦400');
  });
});
