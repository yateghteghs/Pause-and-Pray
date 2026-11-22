/**
 * Browser preview version of billing.ts: no store and no charge. Keeps the
 * RevenueCat SDK out of the web bundle.
 */
import { setPlus } from '../state/store';

export const ENTITLEMENT = 'plus';
export const billingConfigured = false;
export const billingPreview = true;
export const plusAvailable = true;
export const MANAGE_SUBSCRIPTION_URL: string | undefined = undefined;

export interface PlusOffer {
  id: string;
  title: string;
  price: string;
  note?: string;
}

export async function initBilling(): Promise<void> {}

export async function getPlusOffers(): Promise<{ ok: true; offers: PlusOffer[] } | { ok: false; error: string }> {
  return {
    ok: true,
    offers: [
      { id: 'preview-annual', title: 'Yearly', price: 'Preview: no charge', note: 'Your store price appears here' },
      { id: 'preview-monthly', title: 'Monthly', price: 'Preview: no charge', note: 'Your store price appears here' },
    ],
  };
}

export async function buyPlus(_offerId: string): Promise<{ ok: true } | { ok: false; cancelled?: boolean; error?: string }> {
  setPlus({ active: true, until: Date.now() + 30 * 86_400_000, source: 'preview' });
  return { ok: true };
}

export async function restorePlus(): Promise<{ ok: boolean; active: boolean; error?: string }> {
  return { ok: true, active: false };
}
