import { demoApi } from './demo';
import { supabaseApi } from './supabase';
import type { AdminApi } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Live when the Supabase project is configured; otherwise the demo on sample data. */
export const api: AdminApi = url && key ? supabaseApi(url, key) : demoApi;
export * from './types';
