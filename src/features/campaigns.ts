/**
 * Sponsor lines for seasonal campaigns, fetched from Supabase so they can
 * change without an app update, and cached on the phone.
 */
import { Sponsor } from '../core/campaigns';
import { getJSON, setJSON } from '../storage/kv';
import { accountsConfigured, supabase } from './auth';
import { IS_WEB_PREVIEW } from './demo';

const KEY = 'pause-and-pray/campaign-sponsors/v1';

/** In the browser preview, a clearly marked sample shows where the sponsor line goes. */
const PREVIEW_SPONSORS: Record<string, Sponsor> = {
  advent: { name: 'Sample sponsor: St. Joseph Catholic Bookshop', message: 'Your sponsor’s line appears here' },
  lent: { name: 'Sample sponsor: St. Joseph Catholic Bookshop', message: 'Your sponsor’s line appears here' },
};

export function cachedSponsors(): Record<string, Sponsor> {
  if (IS_WEB_PREVIEW && !accountsConfigured) return PREVIEW_SPONSORS;
  return getJSON<Record<string, Sponsor>>(KEY, {});
}

export async function refreshSponsors(): Promise<Record<string, Sponsor>> {
  if (!accountsConfigured) return cachedSponsors();
  const { data, error } = await supabase().from('campaign_sponsors').select('campaign_key, name, message, url');
  if (error || !data) return cachedSponsors();
  const map = Object.fromEntries(
    data.map((r) => [r.campaign_key, { name: r.name, message: r.message ?? undefined, url: r.url ?? undefined }]),
  );
  setJSON(KEY, map);
  return map;
}
