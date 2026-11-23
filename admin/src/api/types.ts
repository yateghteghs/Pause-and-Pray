/** What the admin console can see and do. Mirrors supabase/migrations/0007_admin.sql. */

export type TierId = 'group' | 'parish' | 'community';

export interface Overview {
  accounts: number;
  accounts_new_7d: number;
  groups: number;
  groups_active_7d: number;
  group_members: number;
  organizations_active: number;
  organizations_expiring_30d: number;
  plan_revenue_naira: number;
  plan_requests_new: number;
  reports_open: number;
  /** Totals only: group members who prayed each day (never who). */
  praying_by_day: { day: string; members: number }[];
}

export type RequestStatus = 'new' | 'invoiced' | 'active' | 'declined';

export interface PlanRequest {
  id: string;
  created_at: string;
  status: RequestStatus;
  tier: TierId;
  price_naira: number;
  org_name: string;
  org_kind: string;
  contact_name: string;
  contact_email: string;
  country: string | null;
  expected_members: number | null;
  message: string | null;
}

export interface Organization {
  id: string;
  name: string;
  kind: string;
  tier: TierId;
  price_naira: number;
  plan_active_until: string | null;
  groups: number;
  members: number;
  leaders: string | null;
}

export interface Group {
  id: string;
  name: string;
  intention: string | null;
  org_name: string | null;
  members: number;
  created_at: string;
  last_active: string | null;
  open_reports: number;
}

export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export interface Report {
  id: number;
  group_id: string;
  group_name: string;
  group_intention: string | null;
  reason: string;
  status: ReportStatus;
  resolution: string | null;
  created_at: string;
}

export interface Account {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  groups: number;
  leads: string | null;
}

export interface Sponsor {
  campaign_key: string;
  name: string;
  message: string | null;
  url: string | null;
}

export interface AudioTrack {
  key: string;
  language: string;
  url: string;
  credit: string | null;
}

export interface Admin {
  user_id: string;
  email: string;
  added_at: string;
}

export interface AuditEntry {
  at: string;
  admin_email: string | null;
  action: string;
  target: string | null;
  details: Record<string, unknown>;
}

export interface AdminApi {
  /** 'demo' runs on sample data in the browser; 'live' talks to Supabase. */
  mode: 'demo' | 'live';
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  currentEmail(): Promise<string | null>;
  isAdmin(): Promise<boolean>;

  overview(): Promise<Overview>;
  planRequests(status?: RequestStatus): Promise<PlanRequest[]>;
  setRequestStatus(id: string, status: RequestStatus): Promise<void>;
  activateRequest(id: string, until: string): Promise<void>;
  organizations(search?: string): Promise<Organization[]>;
  updateOrganization(id: string, tier: TierId, until: string): Promise<void>;
  groups(search?: string): Promise<Group[]>;
  deleteGroup(id: string, reason: string): Promise<void>;
  reports(status?: ReportStatus): Promise<Report[]>;
  resolveReport(id: number, status: 'resolved' | 'dismissed', resolution: string): Promise<void>;
  findAccounts(email: string): Promise<Account[]>;
  sendPasswordReset(email: string): Promise<void>;
  deleteAccount(id: string, reason: string): Promise<void>;
  sponsors(): Promise<Sponsor[]>;
  saveSponsor(s: Sponsor): Promise<void>;
  deleteSponsor(key: string): Promise<void>;
  audio(): Promise<AudioTrack[]>;
  saveAudio(t: AudioTrack): Promise<void>;
  deleteAudio(key: string, language: string): Promise<void>;
  admins(): Promise<Admin[]>;
  addAdmin(email: string): Promise<void>;
  removeAdmin(userId: string): Promise<void>;
  audit(limit?: number): Promise<AuditEntry[]>;
}
