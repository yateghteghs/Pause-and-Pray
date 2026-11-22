import { easterSunday, liturgicalDay, moveableDates, saintOfDay } from '../liturgical';
import calendarData from '../../content/calendar.json';
import { dayKey } from '../dates';

const local = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 0);
const key = (d: Date) => dayKey(d);

describe('moveable dates', () => {
  test.each([
    [2019, '2019-04-21'],
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2028, '2028-04-16'],
    [2038, '2038-04-25'],
  ])('Easter %i', (y, expected) => {
    expect(key(easterSunday(y))).toBe(expected);
  });

  test('2027 launch dates in the spec', () => {
    const m = moveableDates(2027);
    expect(key(m.ashWednesday)).toBe('2027-02-10');
    expect(key(m.easter)).toBe('2027-03-28');
    expect(key(m.pentecost)).toBe('2027-05-16');
    expect(key(m.baptism)).toBe('2027-01-10');
    expect(key(m.firstSundayOfAdvent)).toBe('2027-11-28');
  });

  test('Advent and Christ the King 2026', () => {
    const m = moveableDates(2026);
    expect(key(m.christTheKing)).toBe('2026-11-22');
    expect(key(m.firstSundayOfAdvent)).toBe('2026-11-29');
  });

  test('Holy Family moves to 30 December when Christmas is a Sunday', () => {
    expect(key(moveableDates(2022).holyFamily)).toBe('2022-12-30');
    expect(key(moveableDates(2026).holyFamily)).toBe('2026-12-27');
  });

  test('optional Sunday transfers', () => {
    const m = moveableDates(2027, { ascensionToSunday: true, epiphanyToSunday: true, corpusChristiToSunday: true });
    expect(key(m.ascension)).toBe('2027-05-09');
    expect(key(m.epiphany)).toBe('2027-01-03');
    expect(key(m.corpusChristi)).toBe('2027-05-30');
  });
});

describe('liturgical day', () => {
  test('Christ the King outranks St. Cecilia (22 Nov 2026)', () => {
    const d = liturgicalDay(local(2026, 11, 22));
    expect(d.title).toBe('Our Lord Jesus Christ, King of the Universe');
    expect(d.colour).toBe('white');
    expect(d.season).toBe('ordinary');
    expect(d.week).toBe(34);
    const cecilia = d.celebrations.find((c) => c.title === 'St. Cecilia');
    expect(cecilia?.observed).toBe(false);
  });

  test('Ash Wednesday 2027', () => {
    const d = liturgicalDay(local(2027, 2, 10));
    expect(d.title).toBe('Ash Wednesday');
    expect(d.season).toBe('lent');
    expect(d.colour).toBe('violet');
  });

  test('Laetare Sunday outranks Sts. Perpetua and Felicity (7 Mar 2027)', () => {
    const d = liturgicalDay(local(2027, 3, 7));
    expect(d.title).toBe('Fourth Sunday of Lent (Laetare Sunday)');
    expect(d.colour).toBe('rose');
  });

  test('memorial on a Lenten weekday becomes a commemoration', () => {
    const d = liturgicalDay(local(2027, 3, 17));
    expect(d.title).toBe('Wednesday of the 5th Week of Lent');
    expect(d.celebrations[0].rank).toBe('commemoration');
    expect(d.saint?.title).toBe('St. Patrick');
  });

  test('Gaudete Sunday is rose', () => {
    expect(liturgicalDay(local(2026, 12, 13)).colour).toBe('rose');
  });

  test('Immaculate Conception moves off an Advent Sunday', () => {
    expect(liturgicalDay(local(2024, 12, 8)).title).toBe('Second Sunday of Advent');
    expect(liturgicalDay(local(2024, 12, 9)).title).toBe('The Immaculate Conception of the Blessed Virgin Mary');
    expect(liturgicalDay(local(2026, 12, 8)).rank).toBe('solemnity');
  });

  test('Annunciation in Holy Week moves after the Easter octave (2024)', () => {
    expect(liturgicalDay(local(2024, 3, 25)).title).toBe('Monday of Holy Week');
    expect(liturgicalDay(local(2024, 4, 8)).title).toBe('The Annunciation of the Lord');
  });

  test('St. Joseph in Holy Week moves to the Saturday before Palm Sunday (2035)', () => {
    expect(liturgicalDay(local(2035, 3, 17)).title).toBe('St. Joseph, Spouse of the Blessed Virgin Mary');
  });

  test('Ordinary Time week numbering', () => {
    expect(liturgicalDay(local(2027, 1, 11)).title).toBe('Monday of the 1st Week in Ordinary Time');
    expect(liturgicalDay(local(2026, 5, 25)).week).toBe(8);
  });

  test('Easter Time and Pentecost', () => {
    expect(liturgicalDay(local(2027, 3, 28)).title).toBe('Easter Sunday of the Resurrection of the Lord');
    expect(liturgicalDay(local(2027, 3, 30)).title).toBe('Tuesday within the Octave of Easter');
    expect(liturgicalDay(local(2027, 4, 4)).title).toBe('Second Sunday of Easter (Divine Mercy Sunday)');
    const p = liturgicalDay(local(2027, 5, 16));
    expect(p.title).toBe('Pentecost Sunday');
    expect(p.colour).toBe('red');
  });

  test('Good Friday is red', () => {
    const d = liturgicalDay(local(2027, 3, 26));
    expect(d.season).toBe('triduum');
    expect(d.colour).toBe('red');
  });

  test('Uganda Martyrs, an observed memorial in red', () => {
    const d = liturgicalDay(local(2027, 6, 3));
    expect(d.title).toBe('Sts. Charles Lwanga and Companions');
    expect(d.colour).toBe('red');
  });

  test('St. Stephen in the Christmas octave', () => {
    expect(liturgicalDay(local(2026, 12, 26)).title).toBe('St. Stephen, the First Martyr');
    expect(liturgicalDay(local(2026, 12, 29)).title).toBe('5th Day in the Octave of Christmas');
  });

  test('Nigerian national layer', () => {
    expect(liturgicalDay(local(2027, 1, 20)).title).toBe('Bl. Cyprian Michael Iwene Tansi');
  });
});

describe('saint of the day', () => {
  test('today, even when outranked', () => {
    const s = saintOfDay(local(2026, 11, 22))!;
    expect(s.when).toBe('today');
    expect(s.saint.title).toBe('St. Cecilia');
    expect(s.saint.observed).toBe(false);
    expect(s.saint.lived).toBeDefined();
  });
  test('next saint when today has none', () => {
    const s = saintOfDay(local(2026, 11, 24))!;
    expect(s.saint.title).toBe('St. Andrew, Apostle');
    expect(s.when).toBe('2026-11-30');
  });
  test('every saint entry has its life and times', () => {
    for (const e of calendarData.universal as { life?: string; lived?: string; place?: string }[]) {
      if (e.life) expect(e.lived && e.place).toBeTruthy();
    }
  });
});
