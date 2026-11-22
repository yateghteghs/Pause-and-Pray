import { coveredDays, gospelVerse, readingKeys, readingsFor, sundayCycle, weekdayCycle } from '../readings';
import lectionary from '../../content/lectionary.json';
import texts from '../../content/readings-text.json';

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe('Lectionary cycles', () => {
  test('Sunday cycle and weekday cycle', () => {
    expect(sundayCycle(at(2026, 11, 22))).toBe('A');
    expect(sundayCycle(at(2026, 11, 29))).toBe('B');
    expect(sundayCycle(at(2027, 3, 28))).toBe('B');
    expect(sundayCycle(at(2027, 11, 28))).toBe('C');
    expect(weekdayCycle(at(2026, 11, 24))).toBe('II');
    expect(weekdayCycle(at(2027, 1, 12))).toBe('I');
  });
});

describe('reading keys', () => {
  test.each([
    [at(2026, 11, 22), 'christ-the-king-A'],
    [at(2026, 11, 24), 'ot-34-tue-II'],
    [at(2026, 11, 29), 'advent-1-sun-B'],
    [at(2026, 11, 30), 'fixed-11-30'], // St Andrew outranks the Advent weekday
    [at(2026, 12, 1), 'advent-1-tue'],
    [at(2026, 12, 8), 'fixed-12-08'],
    [at(2026, 12, 18), 'advent-dec-18'],
    [at(2026, 12, 20), 'advent-4-sun-B'], // a Sunday, not the 20 December weekday
    [at(2026, 12, 25), 'fixed-12-25'],
    [at(2026, 12, 27), 'holy-family-B'],
    [at(2026, 12, 29), 'christmas-dec-29'],
    [at(2027, 1, 3), 'christmas-2-sun'],
    [at(2027, 1, 6), 'epiphany'],
    [at(2027, 1, 10), 'baptism-B'],
    [at(2027, 2, 10), 'ash-wednesday'],
    [at(2027, 3, 21), 'palm-sunday-B'],
    [at(2027, 3, 28), 'easter-sunday'],
    [at(2027, 5, 16), 'pentecost'],
  ])('%s', (date, key) => {
    expect(readingsFor(date)?.key).toBe(key);
  });

  test('uncovered days return null with sensible keys', () => {
    expect(readingKeys(at(2027, 7, 14))).toEqual(['ot-15-wed-I']);
    expect(readingsFor(at(2027, 7, 14))).toBeNull();
  });
});

describe('content', () => {
  test('every reference has text', () => {
    for (const [key, entry] of Object.entries(lectionary.entries)) {
      for (const r of entry.readings) {
        expect([key, (texts as Record<string, unknown[]>)[r.ref]?.length ?? 0]).not.toEqual([key, 0]);
      }
    }
  });

  test('the Gospel of the day is there for the Prayer Pause', () => {
    const v = gospelVerse(at(2026, 11, 29), 0);
    expect(v?.ref).toBe('Mark 13:33-37');
    expect(v?.verse.text).toMatch(/Watch/);
  });

  test('Advent and Christmas 2026 are fully covered', () => {
    // 29 Nov 2026 (Advent 1) to 10 Jan 2027 (Baptism of the Lord): 43 days
    expect(coveredDays(at(2026, 11, 29), 43)).toBe(43);
  });

  test('no divine name "Yahweh" in prayer texts', () => {
    expect(JSON.stringify(texts)).not.toMatch(/Yahweh/);
  });
});
