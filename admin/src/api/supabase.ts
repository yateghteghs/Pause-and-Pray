import { createClient } from '@supabase/supabase-js';
import type { AdminApi } from './types';

/** Live console: every action is a database function that checks for an admin and logs it. */
export function supabaseApi(url: string, anonKey: string): AdminApi {
  const sb = createClient(url, anonKey, { auth: { persistSession: true } });

  async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as T;
  }
  async function table<T>(name: string, columns: string): Promise<T[]> {
    const { data, error } = await sb.from(name).select(columns);
    if (error) throw new Error(error.message);
    return (data ?? []) as T[];
  }

  return {
    mode: 'live',
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async currentEmail() {
      const { data } = await sb.auth.getUser();
      return data.user?.email ?? null;
    },
    isAdmin: () => rpc<boolean>('is_platform_admin'),
    overview: () => rpc('admin_overview'),
    planRequests: (status) => rpc('admin_list_plan_requests', { p_status: status ?? null }),
    setRequestStatus: (id, status) => rpc('admin_set_plan_request_status', { p_id: id, p_status: status }),
    activateRequest: (id, until) => rpc('admin_activate_plan_request', { p_id: id, p_until: until }),
    organizations: (search) => rpc('admin_list_organizations', { p_search: search || null }),
    updateOrganization: (id, tier, until) => rpc('admin_update_organization', { p_id: id, p_tier: tier, p_until: until }),
    groups: (search) => rpc('admin_list_groups', { p_search: search || null }),
    deleteGroup: (id, reason) => rpc('admin_delete_group', { p_id: id, p_reason: reason }),
    reports: (status) => rpc('admin_list_reports', { p_status: status ?? null }),
    resolveReport: (id, status, resolution) => rpc('admin_resolve_report', { p_id: id, p_status: status, p_resolution: resolution }),
    findAccounts: (email) => rpc('admin_find_accounts', { p_email: email }),
    async sendPasswordReset(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email);
      if (error) throw new Error(error.message);
    },
    deleteAccount: (id, reason) => rpc('admin_delete_account', { p_id: id, p_reason: reason }),
    sponsors: () => table('campaign_sponsors', 'campaign_key, name, message, url'),
    saveSponsor: (s) => rpc('admin_upsert_sponsor', { p_key: s.campaign_key, p_name: s.name, p_message: s.message ?? '', p_url: s.url ?? '' }),
    deleteSponsor: (key) => rpc('admin_delete_sponsor', { p_key: key }),
    audio: () => table('audio_tracks', 'key, language, url, credit'),
    saveAudio: (t) => rpc('admin_upsert_audio', { p_key: t.key, p_language: t.language, p_url: t.url, p_credit: t.credit ?? '' }),
    deleteAudio: (key, language) => rpc('admin_delete_audio', { p_key: key, p_language: language }),
    admins: () => rpc('admin_list_admins'),
    addAdmin: (email) => rpc('admin_add_admin', { p_email: email }),
    removeAdmin: (userId) => rpc('admin_remove_admin', { p_user: userId }),
    audit: (limit = 200) => rpc('admin_audit', { p_limit: limit }),
  };
}
