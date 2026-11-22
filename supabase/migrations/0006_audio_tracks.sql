-- Recorded audio that replaces the phone's read-aloud voice, added without an
-- app update. Upload files to a public Supabase Storage bucket (e.g. "audio")
-- and add a row per recording. Keys: prayer:<id>, intention:<label>, saint:<MM-DD>.
-- Example:
--   insert into public.audio_tracks (key, language, url, credit) values
--   ('prayer:hail-mary', 'en', 'https://<project>.supabase.co/storage/v1/object/public/audio/en/hail-mary.m4a',
--    'Prayed by Fr. Moses, St. Monica Parish');

create table public.audio_tracks (
  key text not null check (char_length(key) between 3 and 120),
  language text not null default 'en' check (char_length(language) between 2 and 10),
  url text not null check (url ~ '^https://'),
  credit text check (char_length(credit) <= 120),
  updated_at timestamptz not null default now(),
  primary key (key, language)
);

alter table public.audio_tracks enable row level security;
create policy "anyone reads audio tracks" on public.audio_tracks for select to anon, authenticated using (true);
