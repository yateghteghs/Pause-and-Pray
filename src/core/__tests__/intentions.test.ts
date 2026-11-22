import intentions from '../../content/intentions.json';
import { intentionPrayer, pausePlan, prayerById } from '../prayers';

const mine = ['My family', 'Peace and safety in my country', 'My studies and exams'];

describe('intention prayers', () => {
  test('every suggested intention has at least two prayers', () => {
    for (const s of intentions.suggestions) {
      expect(s.prayers.length).toBeGreaterThanOrEqual(2);
      for (const p of s.prayers) expect(p).toMatch(/Amen\.$/);
    }
  });

  test('closing prayers exist', () => {
    for (const id of intentions.closings) expect(prayerById(id)).toBeDefined();
  });

  test("the user's own intention is written into a prayer", () => {
    const text = intentionPrayer('My cousin’s safe delivery.', 0);
    expect(text).toContain('“My cousin’s safe delivery”');
    expect(text).not.toContain('{intention}');
  });
});

describe('pause plan', () => {
  test('a paused app prays for one intention, in turn, then a traditional prayer', () => {
    const seen = [0, 1, 2, 3].map((n) => pausePlan(mine, n, 'gate'));
    expect(seen.map((p) => p.sections[0].intention)).toEqual([...mine, mine[0]]);
    expect(seen[0].sections).toHaveLength(2);
    expect(seen[0].sections[1].intention).toBeUndefined();
    expect(['Our Father', 'Hail Mary', 'Glory Be']).toContain(seen[0].sections[1].title);
    // The second round uses the other wording.
    expect(seen[3].sections[0].text).not.toBe(seen[0].sections[0].text);
    expect(seen[0].prayerId).toBe('intention:My family');
  });

  test('Pray now prays for all three intentions', () => {
    const plan = pausePlan(mine, 0, 'pray-now');
    expect(plan.sections.filter((s) => s.intention).map((s) => s.intention)).toEqual(mine);
    expect(plan.sections).toHaveLength(4);
  });

  test('with no intentions it falls back to a short prayer', () => {
    const plan = pausePlan([], 0, 'gate');
    expect(plan.sections).toHaveLength(1);
    expect(plan.sections[0].intention).toBeUndefined();
  });
});
