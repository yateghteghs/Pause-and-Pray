/**
 * Pause & Pray Plus, sold through Google Play and the App Store via RevenueCat
 * (react-native-purchases), which validates receipts and tracks the "plus"
 * entitlement on both stores.
 *
 * Setup (see README): create the subscription products in both stores, add
 * them to a RevenueCat project with an entitlement called "plus" and a default
 * offering, then set EXPO_PUBLIC_REVENUECAT_ANDROID_KEY and
 * EXPO_PUBLIC_REVENUECAT_IOS_KEY. Without keys, the browser preview and
 * development builds use a stand-in that charges nothing.
 */
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { PlusStatus } from '../core/plans';
import { setPlus } from '../state/store';

export const ENTITLEMENT = 'plus';

const apiKey = Platform.select({
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  default: undefined,
});

export const billingConfigured = Boolean(apiKey) && Platform.OS !== 'web';
export const billingPreview = !billingConfigured && (Platform.OS === 'web' || __DEV__);
export const plusAvailable = billingConfigured || billingPreview;

export interface PlusOffer {
  id: string;
  title: string;
  price: string;
  note?: string;
}

let configured = false;
let packages: PurchasesPackage[] = [];

function statusFrom(info: CustomerInfo): PlusStatus {
  const e = info.entitlements.active[ENTITLEMENT];
  return e
    ? { active: true, until: e.expirationDate ? Date.parse(e.expirationDate) : undefined, source: 'store' }
    : { active: false };
}

/** Call once at start-up. Keeps the Plus status in the store up to date. */
export async function initBilling(): Promise<void> {
  if (!billingConfigured || configured) return;
  Purchases.configure({ apiKey: apiKey! });
  configured = true;
  Purchases.addCustomerInfoUpdateListener((info) => setPlus(statusFrom(info)));
  try {
    setPlus(statusFrom(await Purchases.getCustomerInfo()));
  } catch {
    // offline: keep the last known status
  }
}

export async function getPlusOffers(): Promise<{ ok: true; offers: PlusOffer[] } | { ok: false; error: string }> {
  if (billingPreview) {
    return {
      ok: true,
      offers: [
        { id: 'preview-annual', title: 'Yearly', price: 'Preview: no charge', note: 'Your store price appears here' },
        { id: 'preview-monthly', title: 'Monthly', price: 'Preview: no charge', note: 'Your store price appears here' },
      ],
    };
  }
  if (!billingConfigured) return { ok: false, error: 'Plus is not available in this version yet.' };
  try {
    await initBilling();
    const offerings = await Purchases.getOfferings();
    packages = offerings.current?.availablePackages ?? [];
    if (!packages.length) return { ok: false, error: 'Plus is not available in your store yet.' };
    return {
      ok: true,
      offers: packages.map((p) => ({
        id: p.identifier,
        title: p.packageType === 'ANNUAL' ? 'Yearly' : p.packageType === 'MONTHLY' ? 'Monthly' : p.product.title,
        price: p.product.priceString,
        note: p.product.introPrice ? `Starts with ${p.product.introPrice.priceString}` : undefined,
      })),
    };
  } catch {
    return { ok: false, error: 'Could not reach the store. Check your connection and try again.' };
  }
}

export async function buyPlus(offerId: string): Promise<{ ok: true } | { ok: false; cancelled?: boolean; error?: string }> {
  if (billingPreview) {
    setPlus({ active: true, until: Date.now() + 30 * 86_400_000, source: 'preview' });
    return { ok: true };
  }
  const pkg = packages.find((p) => p.identifier === offerId);
  if (!pkg) return { ok: false, error: 'That option is no longer available. Go back and try again.' };
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    setPlus(statusFrom(customerInfo));
    return statusFrom(customerInfo).active ? { ok: true } : { ok: false, error: 'The purchase did not complete.' };
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean | null; message?: string };
    if (err?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, error: err?.message ?? 'The purchase did not complete.' };
  }
}

export async function restorePlus(): Promise<{ ok: boolean; active: boolean; error?: string }> {
  if (billingPreview) return { ok: true, active: false };
  try {
    await initBilling();
    const status = statusFrom(await Purchases.restorePurchases());
    setPlus(status);
    return { ok: true, active: status.active };
  } catch {
    return { ok: false, active: false, error: 'Could not reach the store. Try again.' };
  }
}

/** Where people manage or cancel the subscription. */
export const MANAGE_SUBSCRIPTION_URL = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
  default: undefined,
});
