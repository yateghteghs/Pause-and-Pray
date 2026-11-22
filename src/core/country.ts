/**
 * Pause & Pray is for Catholics everywhere. The General Roman Calendar is the
 * default; a national calendar (feasts, transfers) can be layered on top.
 * Add a country by adding its layer to content/calendar.json and a line here.
 */
export type CountryCode = 'universal' | 'NG';

export const COUNTRIES: { code: CountryCode; label: string }[] = [
  { code: 'universal', label: 'General Roman Calendar' },
  { code: 'NG', label: 'Nigeria' },
];

/** Picks a national calendar from the phone's region when we have one, else the universal calendar. */
export function defaultCountry(locale?: string): CountryCode {
  let tag = locale;
  try {
    tag ??= Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return 'universal';
  }
  const region = tag?.split(/[-_]/).find((part, i) => i > 0 && /^[A-Z]{2}$/.test(part));
  return COUNTRIES.some((c) => c.code === region) ? (region as CountryCode) : 'universal';
}
