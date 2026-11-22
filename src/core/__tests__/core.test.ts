import { mysterySetFor } from '../rosary';
import { activeWindow, DEFAULT_SCHEDULE, resolvePrayerId } from '../schedule';
import { GateConfig, shouldGate, unlock } from '../gate';
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

describe('schedule', () => {
  test('active windows', () => {
    expect(activeWindow(DEFAULT_SCHEDULE, at(2026, 11, 23, 12, 5))?.id).toBe('angelus-12');
    expect(activeWindow(DEFAULT_SCHEDULE, at(2026, 11, 23, 15, 14))?.id).toBe('mercy-15');
    expect(activeWindow(DEFAULT_SCHEDULE, at(2026, 11, 23, 15, 15))).toBeUndefined();
    expect(activeWindow(DEFAULT_SCHEDULE, at(2026, 11, 23, 21, 40))).toBeUndefined(); // night prayer off by default
  });

  test('windows that cross midnight', () => {
    const late = [{ ...DEFAULT_SCHEDULE[5], enabled: true, hour: 23, minute: 50, windowMinutes: 30 }];
    expect(activeWindow(late, at(2026, 11, 23, 0, 10))?.id).toBe('night');
    expect(activeWindow(late, at(2026, 11, 23, 0, 25))).toBeUndefined();
  });

  test('Regina Caeli replaces the Angelus in Easter Time', () => {
    const angelus = DEFAULT_SCHEDULE.find((t) => t.id === 'angelus-12')!;
    expect(resolvePrayerId(angelus, at(2027, 4, 10))).toBe('regina-caeli');
    expect(resolvePrayerId(angelus, at(2027, 6, 10))).toBe('angelus');
  });
});

describe('gate', () => {
  const base: GateConfig = {
    gatedApps: ['com.instagram.android'],
    mode: 'every-open',
    unlockMinutes: 15,
    schedule: DEFAULT_SCHEDULE,
    unlockedUntil: {},
  };
  const now = at(2026, 11, 23, 10).getTime();

  test('every-open mode gates chosen apps only', () => {
    expect(shouldGate('com.instagram.android', now, base)).toBe(true);
    expect(shouldGate('com.android.chrome', now, base)).toBe(false);
  });

  test('unlock window', () => {
    const cfg = unlock(base, 'com.instagram.android', now);
    expect(shouldGate('com.instagram.android', now + 14 * 60_000, cfg)).toBe(false);
    expect(shouldGate('com.instagram.android', now + 15 * 60_000, cfg)).toBe(true);
  });

  test('prayer-times mode gates only inside a window', () => {
    const cfg = { ...base, mode: 'prayer-times' as const };
    expect(shouldGate('com.instagram.android', now, cfg)).toBe(false);
    expect(shouldGate('com.instagram.android', at(2026, 11, 23, 12, 1).getTime(), cfg)).toBe(true);
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
