import { currentCampaign } from '../campaigns';
import { PauseEvent } from '../stats';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
const prayed = (d: Date): PauseEvent => ({ at: d.getTime(), outcome: 'prayed', prayerId: 'x', app: 'none', seconds: 30 });

describe('campaigns', () => {
  test('Advent 2026 is announced a week ahead', () => {
    const c = currentCampaign(at(2026, 11, 22), []);
    expect(c?.id).toBe('advent');
    expect(c?.state).toBe('upcoming');
    expect(c?.daysUntil).toBe(7);
    expect(c?.start).toBe('2026-11-29');
  });

  test('progress during Advent', () => {
    const events = [prayed(at(2026, 11, 29)), prayed(at(2026, 11, 30)), prayed(at(2026, 12, 2))];
    const c = currentCampaign(at(2026, 12, 2), events)!;
    expect(c.state).toBe('active');
    expect(c.dayNumber).toBe(4);
    expect(c.daysPrayed).toBe(3);
    expect(c.totalDays).toBe(26);
  });

  test('Lent 2027 runs from Ash Wednesday to Holy Saturday', () => {
    const c = currentCampaign(at(2027, 2, 10), [])!;
    expect(c.key).toBe('lent-2027');
    expect(c.start).toBe('2027-02-10');
    expect(c.end).toBe('2027-03-27');
    expect(c.totalDays).toBe(46);
  });

  test('sponsor per year overrides the default', () => {
    const c = currentCampaign(at(2027, 2, 12), [], { 'lent-2027': { name: 'Parish bookshop' } })!;
    expect(c.sponsor?.name).toBe('Parish bookshop');
  });

  test('nothing in ordinary time', () => {
    expect(currentCampaign(at(2027, 7, 1), [])).toBeUndefined();
  });
});
