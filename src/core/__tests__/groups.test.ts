import { groupTimeToLocal, makeInviteCode, normaliseCode, zoneOffsetMinutes } from '../groups';

describe('groups', () => {
  test('invite codes avoid look-alike characters', () => {
    const codes = Array.from({ length: 200 }, () => makeInviteCode());
    for (const c of codes) expect(c).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  });

  test('codes are tidied before lookup', () => {
    expect(normaliseCode(' pray-7k ')).toBe('PRAY7K');
  });

  test('time-zone offsets', () => {
    const winter = new Date(Date.UTC(2027, 0, 15, 12));
    const summer = new Date(Date.UTC(2027, 6, 15, 12));
    expect(zoneOffsetMinutes('Africa/Lagos', winter)).toBe(60);
    expect(zoneOffsetMinutes('Europe/London', winter)).toBe(0);
    expect(zoneOffsetMinutes('Europe/London', summer)).toBe(60);
    expect(zoneOffsetMinutes('America/New_York', winter)).toBe(-300);
  });

  test("a group's 8pm in Lagos is the same moment everywhere", () => {
    const now = new Date(Date.UTC(2027, 0, 15, 9));
    const local = groupTimeToLocal(20, 0, 'Africa/Lagos', now);
    // 8pm in Lagos (UTC+1) is 19:00 UTC; express that in this machine's local time
    const expected = new Date(Date.UTC(2027, 0, 15, 19, 0));
    expect(local).toEqual({ hour: expected.getHours(), minute: expected.getMinutes() });
  });

  test('an unknown time zone falls back to local time', () => {
    expect(groupTimeToLocal(7, 30, 'Not/AZone')).toEqual({ hour: 7, minute: 30 });
  });
});
