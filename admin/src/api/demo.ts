import { PARISH_TIERS } from '../../../src/core/pricing';
import type {
  Account, Admin, AdminApi, AudioTrack, AuditEntry, Group, Organization, Overview, PlanRequest, Report, Sponsor, TierId,
} from './types';

/**
 * Demo console: fictional sample data held in memory, so the console can be
 * tried without a Supabase project. Nothing is saved; a reload starts over.
 */
const day = 86_400_000;
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
const date = (ms: number) => iso(ms).slice(0, 10);
const price = (tier: TierId) => PARISH_TIERS.find((t) => t.id === tier)!.naira;

const state = {
  requests: [
    { id: 'r1', created_at: iso(now - 2 * day), status: 'new', tier: 'parish', price_naira: 0, org_name: 'St. Kizito Parish', org_kind: 'parish', contact_name: 'Fr. Emeka (sample)', contact_email: 'kizito.parish@example.org', country: 'Nigeria', expected_members: 220, message: 'For our youth, CWO and Legion of Mary.' },
    { id: 'r2', created_at: iso(now - 5 * day), status: 'new', tier: 'group', price_naira: 0, org_name: 'Holy Trinity Youth Fellowship', org_kind: 'association', contact_name: 'Ngozi (sample)', contact_email: 'trinity.youth@example.org', country: 'Nigeria', expected_members: 40, message: null },
    { id: 'r3', created_at: iso(now - 9 * day), status: 'invoiced', tier: 'community', price_naira: 0, org_name: 'Mater Dei College', org_kind: 'school', contact_name: 'Sr. Agnes (sample)', contact_email: 'materdei@example.org', country: 'Ghana', expected_members: 600, message: 'All six year groups.' },
  ] as PlanRequest[],
  orgs: [
    { id: 'o1', name: 'St. Augustine Chaplaincy', kind: 'chaplaincy', tier: 'parish', price_naira: 0, plan_active_until: iso(now + 210 * day), groups: 6, members: 184, leaders: 'chaplain@example.org' },
    { id: 'o2', name: 'Our Lady of Peace Parish', kind: 'parish', tier: 'community', price_naira: 0, plan_active_until: iso(now + 12 * day), groups: 14, members: 512, leaders: 'olp.secretary@example.org' },
    { id: 'o3', name: 'St. Jude Youth Group', kind: 'association', tier: 'group', price_naira: 0, plan_active_until: iso(now + 95 * day), groups: 1, members: 37, leaders: 'stjude.youth@example.org' },
    { id: 'o4', name: 'Corpus Christi School', kind: 'school', tier: 'parish', price_naira: 0, plan_active_until: iso(now - 20 * day), groups: 4, members: 96, leaders: 'cc.school@example.org' },
  ] as Organization[],
  groups: [
    { id: 'g1', name: 'Chaplaincy Rosary Circle', intention: 'Students preparing for exams', org_name: 'St. Augustine Chaplaincy', members: 48, created_at: iso(now - 90 * day), last_active: date(now), open_reports: 0 },
    { id: 'g2', name: 'CWO Morning Offering', intention: 'Our families', org_name: 'Our Lady of Peace Parish', members: 61, created_at: iso(now - 70 * day), last_active: date(now), open_reports: 0 },
    { id: 'g3', name: 'St. Jude Youth', intention: 'Young people far from the faith', org_name: 'St. Jude Youth Group', members: 37, created_at: iso(now - 40 * day), last_active: date(now - day), open_reports: 0 },
    { id: 'g4', name: 'Okafor family prayers', intention: 'Healing for Grandma', org_name: null, members: 7, created_at: iso(now - 30 * day), last_active: date(now), open_reports: 0 },
    { id: 'g5', name: 'Earn ₦50k daily from home!!', intention: 'Message me for the link', org_name: null, members: 3, created_at: iso(now - 2 * day), last_active: null, open_reports: 2 },
    { id: 'g6', name: 'Legion of Mary Praesidium', intention: 'The souls in purgatory', org_name: 'Our Lady of Peace Parish', members: 22, created_at: iso(now - 60 * day), last_active: date(now - 2 * day), open_reports: 0 },
  ] as Group[],
  reports: [
    { id: 1, group_id: 'g5', group_name: 'Earn ₦50k daily from home!!', group_intention: 'Message me for the link', reason: 'This is a scam advert, not a prayer group.', status: 'open', resolution: null, created_at: iso(now - day) },
    { id: 2, group_id: 'g5', group_name: 'Earn ₦50k daily from home!!', group_intention: 'Message me for the link', reason: 'Spam', status: 'open', resolution: null, created_at: iso(now - 3600_000) },
  ] as Report[],
  accounts: [
    'ada.okafor', 'ben.tersoo', 'chiamaka.eze', 'daniel.audu', 'esther.bello', 'francis.ogbu', 'grace.adeyemi',
    'joseph.ikwue', 'teresa.nnamdi', 'chaplain', 'olp.secretary', 'stjude.youth',
  ].map((n, i) => ({
    id: `u${i}`,
    email: `${n}@example.org`,
    created_at: iso(now - (i * 11 + 3) * day),
    last_sign_in_at: iso(now - (i % 4) * day),
    groups: i % 3,
    leads: n === 'chaplain' ? 'St. Augustine Chaplaincy' : n === 'olp.secretary' ? 'Our Lady of Peace Parish' : null,
  })) as Account[],
  sponsors: [{ campaign_key: 'advent-2026', name: 'Sample sponsor: St. Joseph Catholic Bookshop', message: 'Praying with you this Advent', url: null }] as Sponsor[],
  audio: [{ key: 'prayer:hail-mary', language: 'en', url: 'https://example.org/audio/en/hail-mary.m4a', credit: 'Sample: prayed by Fr. Moses' }] as AudioTrack[],
  admins: [{ user_id: 'me', email: 'you@example.org', added_at: iso(now - 30 * day) }] as Admin[],
  audit: [
    { at: iso(now - 3 * day), admin_email: 'you@example.org', action: 'plan_request.activate', target: 'St. Jude Youth Group', details: { until: date(now + 95 * day) } },
    { at: iso(now - 6 * day), admin_email: 'you@example.org', action: 'sponsor.save', target: 'advent-2026', details: { name: 'Sample sponsor' } },
  ] as AuditEntry[],
};
state.requests.forEach((r) => (r.price_naira = price(r.tier)));
state.orgs.forEach((o) => (o.price_naira = price(o.tier)));

/** A plausible, fixed 30-day series of members praying (sample). */
const series = Array.from({ length: 30 }, (_, i) => {
  const d = now - (29 - i) * day;
  const weekday = new Date(d).getDay();
  const base = 300 + i * 6 + (weekday === 0 ? 120 : weekday === 6 ? -40 : 0);
  return { day: date(d), members: Math.round(base + ((i * 37) % 23) - 11) };
});

function log(action: string, target: string, details: Record<string, unknown> = {}) {
  state.audit.unshift({ at: iso(Date.now()), admin_email: 'you@example.org', action, target, details });
}
const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 120));
const fail = (message: string) => Promise.reject(new Error(message));

export const demoApi: AdminApi = {
  mode: 'demo',
  signIn: async () => {},
  signOut: async () => {},
  currentEmail: async () => 'you@example.org',
  isAdmin: async () => true,

  overview() {
    const active = state.orgs.filter((o) => o.plan_active_until && Date.parse(o.plan_active_until) > Date.now());
    const o: Overview = {
      accounts: 1843 + state.accounts.length - 12,
      accounts_new_7d: 126,
      groups: state.groups.length + 151,
      groups_active_7d: 118,
      group_members: 2210,
      organizations_active: active.length,
      organizations_expiring_30d: active.filter((x) => Date.parse(x.plan_active_until!) < Date.now() + 30 * day).length,
      plan_revenue_naira: active.reduce((n, x) => n + x.price_naira, 0),
      plan_requests_new: state.requests.filter((r) => r.status === 'new').length,
      reports_open: state.reports.filter((r) => r.status === 'open').length,
      praying_by_day: series,
    };
    return wait(o);
  },
  planRequests: (status) => wait(state.requests.filter((r) => !status || r.status === status)),
  async setRequestStatus(id, status) {
    const r = state.requests.find((x) => x.id === id);
    if (!r) return fail('No such request');
    r.status = status;
    log('plan_request.status', r.org_name, { status });
  },
  async activateRequest(id, until) {
    const r = state.requests.find((x) => x.id === id);
    if (!r) return fail('No such request');
    if (Date.parse(until) <= Date.now()) return fail('The paid-until date must be in the future');
    r.status = 'active';
    state.orgs.unshift({ id: `o${Date.now()}`, name: r.org_name, kind: r.org_kind, tier: r.tier, price_naira: r.price_naira, plan_active_until: new Date(until).toISOString(), groups: 0, members: 0, leaders: r.contact_email });
    log('plan_request.activate', r.org_name, { until, tier: r.tier });
  },
  organizations: (search) => wait(state.orgs.filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()))),
  async updateOrganization(id, tier, until) {
    const o = state.orgs.find((x) => x.id === id);
    if (!o) return fail('No such organisation');
    Object.assign(o, { tier, price_naira: price(tier), plan_active_until: new Date(until).toISOString() });
    log('organization.update', o.name, { tier, until });
  },
  groups: (search) => wait(state.groups.filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase()))),
  async deleteGroup(id, reason) {
    const g = state.groups.find((x) => x.id === id);
    if (!g) return fail('No such group');
    state.groups = state.groups.filter((x) => x.id !== id);
    state.reports = state.reports.filter((r) => r.group_id !== id);
    log('group.delete', g.name, { reason });
  },
  reports: (status) => wait(state.reports.filter((r) => !status || r.status === status)),
  async resolveReport(id, status, resolution) {
    const r = state.reports.find((x) => x.id === id);
    if (!r) return fail('No such report');
    Object.assign(r, { status, resolution });
    const g = state.groups.find((x) => x.id === r.group_id);
    if (g) g.open_reports = state.reports.filter((x) => x.group_id === g.id && x.status === 'open').length;
    log(`report.${status}`, r.group_name, { resolution });
  },
  async findAccounts(email) {
    if (email.trim().length < 3) return fail('Type at least 3 characters of the email');
    log('account.search', '', { query: email });
    return wait(state.accounts.filter((a) => a.email.includes(email.trim().toLowerCase())));
  },
  async sendPasswordReset(email) {
    log('account.password_reset', email);
  },
  async deleteAccount(id, reason) {
    const a = state.accounts.find((x) => x.id === id);
    if (!a) return fail('No such account');
    state.accounts = state.accounts.filter((x) => x.id !== id);
    log('account.delete', a.email, { reason });
  },
  sponsors: () => wait(state.sponsors),
  async saveSponsor(s) {
    state.sponsors = [...state.sponsors.filter((x) => x.campaign_key !== s.campaign_key), s];
    log('sponsor.save', s.campaign_key, { name: s.name });
  },
  async deleteSponsor(key) {
    state.sponsors = state.sponsors.filter((x) => x.campaign_key !== key);
    log('sponsor.delete', key);
  },
  audio: () => wait(state.audio),
  async saveAudio(t) {
    if (!/^https:\/\//.test(t.url)) return fail('The file address must start with https://');
    state.audio = [...state.audio.filter((x) => !(x.key === t.key && x.language === t.language)), t];
    log('audio.save', t.key, { language: t.language });
  },
  async deleteAudio(key, language) {
    state.audio = state.audio.filter((x) => !(x.key === key && x.language === language));
    log('audio.delete', key, { language });
  },
  admins: () => wait(state.admins),
  async addAdmin(email) {
    const a = state.accounts.find((x) => x.email === email.trim().toLowerCase());
    if (!a) return fail('No account with that email. They must sign up in the app first.');
    if (!state.admins.some((x) => x.user_id === a.id)) state.admins.push({ user_id: a.id, email: a.email, added_at: iso(Date.now()) });
    log('admin.add', a.email);
  },
  async removeAdmin(userId) {
    if (state.admins.length <= 1) return fail('You cannot remove the last administrator');
    const a = state.admins.find((x) => x.user_id === userId);
    state.admins = state.admins.filter((x) => x.user_id !== userId);
    log('admin.remove', a?.email ?? userId);
  },
  audit: (limit = 200) => wait(state.audit.slice(0, limit)),
};
