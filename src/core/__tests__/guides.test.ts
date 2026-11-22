import { chapletSteps, NOVENAS, novenaProgress, rosarySteps, totalCount } from '../guides';

describe('guided prayers', () => {
  test('a Rosary has 5 decades of 10 Hail Marys, plus the opening 3', () => {
    const steps = rosarySteps('sorrowful');
    const hailMarys = steps.filter((s) => s.title === 'Hail Mary').reduce((n, s) => n + s.count, 0);
    expect(hailMarys).toBe(53);
    expect(steps.filter((s) => s.title === 'The Agony in the Garden')).toHaveLength(1);
    expect(steps[steps.length - 1].title).toBe('Sign of the Cross');
  });

  test('the Chaplet has 5 decades of 10 and the Holy God three times', () => {
    const steps = chapletSteps();
    expect(steps.filter((s) => s.count === 10)).toHaveLength(5);
    expect(steps.find((s) => s.title === 'Holy God')?.count).toBe(3);
    expect(totalCount(steps)).toBe(4 + 5 * 11 + 3 + 1);
  });

  test('the novena has nine days, each with scripture', () => {
    expect(NOVENAS[0].days).toHaveLength(9);
    for (const d of NOVENAS[0].days) expect(d.verse.length).toBeGreaterThan(20);
  });

  test('novena progress: one day per calendar day', () => {
    expect(novenaProgress([], '2026-11-23')).toEqual({ nextDay: 1, doneToday: false });
    expect(novenaProgress(['2026-11-23'], '2026-11-23')).toEqual({ nextDay: 2, doneToday: true });
    expect(novenaProgress(['2026-11-23'], '2026-11-25')).toEqual({ nextDay: 2, doneToday: false });
    const all = Array.from({ length: 9 }, (_, i) => `2026-11-${23 + i}`);
    expect(novenaProgress(all, '2026-12-01').nextDay).toBe(10);
  });
});
