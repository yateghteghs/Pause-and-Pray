import { mysterySetFor } from '../rosary';
import { defaultSchedule, duePrayer, newPersonalTime, nextPrayer, resolvePrayerId } from '../schedule';
import { canSkip, GateConfig, markPrayed, shouldGate, unlock } from '../gate';
import { computeStats, PauseEvent } from '../stats';
import { GATE_PRAYERS, pausePrayer, PRAYERS } from '../prayers';

const at = (y: number, m: number, d: number, h = 10, min = 0) => new Date(y, m - 1, d, h, min);

describe('rosary', () => {
  test('weekday pattern', () => {
    // 22 Nov 2026 is a Sunday
    expect([22, 23, 24, 25, 26, 27, 28].map((d) => mysterySetFor(at(2026, 11, d)))).toEqual([
      'glorious', 'joyful', 'sorrowful', 'glorious', 'luminous', 'sorrowful', 'joyful',
    ]);
  });
});

describe('prayer times', () => {
  const created = at(2026, 11, 22, 20).getTime(); // set up on Sunday evening
  const schedule = defaultSchedule(created); // 7am personal time; devotions off
  const mercy = { ...schedule.find((t) => t.id === 'mercy-15')!, enabled: true };
  const withMercy = schedule.map((t) => (t.id === 'mercy-15' ? mercy : t));

  test('devotions are off by default', () => {
    expect(schedule.filter((t) => t.kind === 'devotion').every((t) => !t.enabled)).toBe(true);
  });

  test('nothing is due before the first prayer time comes round', () => {
    expect(duePrayer(schedule, at(2026, 11, 22, 23).getTime(), 0)).toBeUndefined();
    expect(duePrayer(schedule, at(2026, 11, 23, 6, 59).getTime(), 0)).toBeUndefined();
  });

  test('a prayer time stays due until the user prays, however long that takes', () => {
    expect(duePrayer(schedule, at(2026, 11, 23, 7, 0).getTime(), 0)?.time.id).toBe('personal-1');
    expect(duePrayer(schedule, at(2026, 11, 23, 13, 0).getTime(), 0)?.time.id).toBe('personal-1');
    const prayed = at(2026, 11, 23, 13, 5).getTime();
    expect(duePrayer(schedule, at(2026, 11, 23, 20, 0).getTime(), prayed)).toBeUndefined();
    expect(duePrayer(schedule, at(2026, 11, 24, 7, 1).getTime(), prayed)?.time.id).toBe('personal-1');
  });

  test('a devotion, once turned on, works like a prayer time', () => {
    const prayedAt7 = at(2026, 11, 23, 7, 10).getTime();
    expect(duePrayer(withMercy, at(2026, 11, 23, 14, 59).getTime(), prayedAt7)).toBeUndefined();
    expect(duePrayer(withMercy, at(2026, 11, 23, 15, 0).getTime(), prayedAt7)?.time.id).toBe('mercy-15');
  });

  test('a time added later in the day starts tomorrow', () => {
    const added = at(2026, 11, 23, 16).getTime();
    const extra = newPersonalTime(schedule, 9, 0, added);
    expect(extra.id).toBe('personal-2');
    const s2 = [...schedule, extra];
    const prayed = at(2026, 11, 23, 7, 5).getTime();
    expect(duePrayer(s2, at(2026, 11, 23, 17).getTime(), prayed)).toBeUndefined();
    expect(duePrayer(s2, at(2026, 11, 24, 9, 1).getTime(), at(2026, 11, 24, 7, 5).getTime())?.time.id).toBe('personal-2');
  });

  test('next prayer', () => {
    expect(nextPrayer(withMercy, at(2026, 11, 23, 10).getTime())?.time.id).toBe('mercy-15');
    expect(nextPrayer(withMercy, at(2026, 11, 23, 16).getTime())?.time.id).toBe('personal-1');
  });

  test('Regina Caeli replaces the Angelus in Easter Time', () => {
    const angelus = schedule.find((t) => t.id === 'angelus-12')!;
    expect(resolvePrayerId(angelus, at(2027, 4, 10))).toBe('regina-caeli');
    expect(resolvePrayerId(angelus, at(2027, 6, 10))).toBe('angelus');
  });
});

describe('gate', () => {
  const created = at(2026, 11, 22, 20).getTime();
  const base: GateConfig = {
    gatedApps: ['com.instagram.android'],
    mode: 'prayer-times',
    unlockMinutes: 15,
    schedule: defaultSchedule(created),
    lastPrayedAt: 0,
    unlockedUntil: {},
  };
  const morning = at(2026, 11, 23, 8).getTime();

  test('prayer-times mode: paused from the prayer time until "I\'ve prayed", no skip', () => {
    expect(shouldGate('com.instagram.android', at(2026, 11, 23, 6).getTime(), base)).toBe(false);
    expect(shouldGate('com.instagram.android', morning, base)).toBe(true);
    expect(shouldGate('com.android.chrome', morning, base)).toBe(false);
    expect(canSkip(morning, base)).toBe(false);
    const prayed = markPrayed(base, morning);
    expect(shouldGate('com.instagram.android', morning + 60_000, prayed)).toBe(false);
  });

  test('every-open mode: unlock window, and a due prayer time still wins', () => {
    const cfg = { ...base, mode: 'every-open' as const, lastPrayedAt: morning };
    const later = at(2026, 11, 23, 10).getTime();
    expect(shouldGate('com.instagram.android', later, cfg)).toBe(true);
    expect(canSkip(later, cfg)).toBe(true);
    const open = unlock(cfg, 'com.instagram.android', later);
    expect(shouldGate('com.instagram.android', later + 14 * 60_000, open)).toBe(false);
    expect(shouldGate('com.instagram.android', later + 15 * 60_000, open)).toBe(true);
    // the next morning's prayer time pauses the app even inside an unlock window
    const nextMorning = at(2026, 11, 24, 7, 5).getTime();
    const openNextDay = unlock(cfg, 'com.instagram.android', nextMorning - 60_000);
    expect(shouldGate('com.instagram.android', nextMorning, openNextDay)).toBe(true);
  });
});

describe('stats', () => {
  const ev = (d: Date, outcome: PauseEvent['outcome'], seconds = 60): PauseEvent => ({
    at: d.getTime(), outcome, prayerId: 'hail-mary', app: 'x', seconds,
  });

  test('streaks and counts', () => {
    const events = [
      ev(at(2026, 11, 15), 'prayed'),
      ev(at(2026, 11, 16), 'prayed'),
      ev(at(2026, 11, 17), 'prayed'),
      ev(at(2026, 11, 19), 'skipped'),
      ev(at(2026, 11, 20), 'prayed'),
      ev(at(2026, 11, 21), 'closed', 120),
    ];
    const s = computeStats(events, at(2026, 11, 22, 8));
    expect(s.currentStreak).toBe(2); // 20–21 Nov; today not yet prayed
    expect(s.longestStreak).toBe(3);
    expect(s.daysPrayed).toBe(5);
    expect(s.prayersSaid).toBe(5);
    expect(s.skips).toBe(1);
    expect(s.timesPutDown).toBe(1);
    expect(s.minutesInPrayer).toBe(6);
    expect(s.prayedRate).toBeCloseTo(5 / 6);
  });

  test('a skip does not count as prayer for the streak', () => {
    const s = computeStats([ev(at(2026, 11, 22), 'skipped')], at(2026, 11, 22, 20));
    expect(s.currentStreak).toBe(0);
    expect(s.prayedRate).toBe(0);
  });
});

describe('content', () => {
  test('every prayer has text and a review status', () => {
    for (const p of PRAYERS) {
      expect(p.text.length).toBeGreaterThan(10);
      expect(p.reviewStatus).toBeDefined();
    }
    expect(new Set(PRAYERS.map((p) => p.id)).size).toBe(PRAYERS.length);
  });

  test('pause prayers rotate', () => {
    expect(pausePrayer(0).id).not.toBe(pausePrayer(1).id);
    expect(pausePrayer(GATE_PRAYERS.length).id).toBe(pausePrayer(0).id);
  });
});
