/**
 * Optional accounts (sign up / sign in) on Supabase.
 *
 * Only the account itself (name, email, password handled by Supabase Auth)
 * lives on the server. Prayer history, intentions and settings stay on the
 * phone, because they reveal the user's religion (sensitive data under the
 * NDPA 2023 and the GDPR).
 *
 * Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see .env.example).
 * Without them, the browser preview and development builds use a stand-in
 * that keeps the name and email on the device and never stores a password.
 */
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Storage from '../storage/session';

export interface Account {
  name: string;
  email: string;
  /** "preview" accounts exist only on this device and are not real sign-ins. */
  kind: 'supabase' | 'preview';
}

export type AuthResult = { ok: true; account: Account; needsEmailConfirmation?: boolean } | { ok: false; error: string };

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const accountsConfigured = Boolean(url && anonKey);
/** The stand-in runs only where nobody relies on it: the web preview and dev builds. */
export const previewAccounts = !accountsConfigured && (Platform.OS === 'web' || __DEV__);
export const accountsAvailable = accountsConfigured || previewAccounts;

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        storage: Storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

function toAccount(user: { email?: string; user_metadata?: Record<string, unknown> }): Account {
  return {
    name: String(user.user_metadata?.name ?? ''),
    email: user.email ?? '',
    kind: 'supabase',
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignUp(name: string, email: string, password: string): string | null {
  if (!name.trim()) return 'Enter your name.';
  if (!EMAIL.test(email.trim())) return 'Enter a valid email address, like ada@example.com.';
  if (password.length < 8) return 'Use a password of at least 8 characters.';
  return null;
}

function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'That email and password do not match. Check them and try again.';
  if (/already registered|already exists/i.test(message)) return 'There is already an account with this email. Sign in instead.';
  if (/email not confirmed/i.test(message)) return 'Confirm your email first: open the link we sent you, then sign in.';
  if (/network|fetch/i.test(message)) return 'No connection. Check your internet and try again.';
  return message;
}

export async function signUp(name: string, email: string, password: string): Promise<AuthResult> {
  const invalid = validateSignUp(name, email, password);
  if (invalid) return { ok: false, error: invalid };
  if (!accountsConfigured) {
    return { ok: true, account: { name: name.trim(), email: email.trim(), kind: 'preview' } };
  }
  const { data, error } = await supabase().auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim() } },
  });
  if (error || !data.user) return { ok: false, error: friendly(error?.message ?? 'Sign-up failed. Try again.') };
  return { ok: true, account: toAccount(data.user), needsEmailConfirmation: !data.session };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!EMAIL.test(email.trim())) return { ok: false, error: 'Enter a valid email address.' };
  if (!password) return { ok: false, error: 'Enter your password.' };
  if (!accountsConfigured) {
    return { ok: true, account: { name: email.split('@')[0], email: email.trim(), kind: 'preview' } };
  }
  const { data, error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) return { ok: false, error: friendly(error?.message ?? 'Sign-in failed. Try again.') };
  return { ok: true, account: toAccount(data.user) };
}

export async function sendPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!EMAIL.test(email.trim())) return { ok: false, error: 'Enter the email address of your account.' };
  if (!accountsConfigured) return { ok: true };
  const { error } = await supabase().auth.resetPasswordForEmail(email.trim());
  return error ? { ok: false, error: friendly(error.message) } : { ok: true };
}

export async function signOut(): Promise<void> {
  if (accountsConfigured) await supabase().auth.signOut();
}

/** Deletes the server account (see supabase/migrations), then signs out. */
export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  if (!accountsConfigured) return { ok: true };
  const { error } = await supabase().rpc('delete_my_account');
  if (error) return { ok: false, error: friendly(error.message) };
  await supabase().auth.signOut();
  return { ok: true };
}

/** The signed-in account restored from the saved session, if any. */
export async function restoreAccount(): Promise<Account | null> {
  if (!accountsConfigured) return null;
  const { data } = await supabase().auth.getSession();
  return data.session?.user ? toAccount(data.session.user) : null;
}
