-- Sponsors for seasonal campaigns, editable without an app update.
-- campaign_key is "<campaign id>-<year>" (e.g. "lent-2027") or just the id for every year.
-- Example:
--   insert into public.campaign_sponsors (campaign_key, name, message, url)
--   values ('lent-2027', 'St. Joseph Catholic Bookshop', 'Praying with you this Lent', 'https://example.org');

create table public.campaign_sponsors (
  campaign_key text primary key check (char_length(campaign_key) between 2 and 40),
  name text not null check (char_length(name) between 2 and 80),
  message text check (char_length(message) <= 140),
  url text check (url is null or url ~ '^https://'),
  updated_at timestamptz not null default now()
);

alter table public.campaign_sponsors enable row level security;

-- Anyone may read sponsor lines (they are public); only you edit them, in the dashboard.
create policy "anyone reads sponsors" on public.campaign_sponsors for select to anon, authenticated using (true);
