-- Cairn community schema for Supabase (Postgres 15+).
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- Everyone (signed in or not) can read tips, votes totals, comments and photos.
-- Only signed-in users can post, and only the author can edit or delete their own posts.
-- Reported posts can be hidden by setting hidden = true in the Table Editor.

-- Profiles: the public display name for each account.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 30),
  created_at timestamptz not null default now()
);

-- Tips: short, practical advice about a peak, ranked by votes.
create table public.tips (
  id uuid primary key default gen_random_uuid(),
  hill_id integer not null,
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  body text not null check (char_length(trim(body)) between 3 and 280),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index tips_hill_idx on public.tips (hill_id);

-- One vote per user per tip: +1 helpful, -1 not helpful.
create table public.tip_votes (
  tip_id uuid not null references public.tips on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (tip_id, user_id)
);

-- Comments about a peak or its routes, with an optional photo in the 'photos' bucket.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  hill_id integer not null,
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  photo_path text,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_hill_idx on public.comments (hill_id);

-- Reports from users. Not readable by the app; review them in the dashboard.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('tip', 'comment')),
  target_id uuid not null,
  reporter_id uuid not null default auth.uid() references public.profiles on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

-- Views the app reads from. security_invoker makes them respect the RLS policies below.
create view public.tips_ranked with (security_invoker = true) as
select t.id, t.hill_id, t.author_id, p.display_name as author_name, t.body, t.created_at,
       coalesce((select sum(v.value) from public.tip_votes v where v.tip_id = t.id), 0)::int as score,
       coalesce((select v.value from public.tip_votes v where v.tip_id = t.id and v.user_id = auth.uid()), 0)::int as my_vote
from public.tips t
join public.profiles p on p.id = t.author_id
where not t.hidden;

create view public.comments_with_authors with (security_invoker = true) as
select c.id, c.hill_id, c.author_id, p.display_name as author_name, c.body, c.photo_path, c.created_at
from public.comments c
join public.profiles p on p.id = c.author_id
where not c.hidden;

-- Row-level security.
alter table public.profiles enable row level security;
alter table public.tips enable row level security;
alter table public.tip_votes enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;

create policy "profiles are public" on public.profiles for select using (true);
create policy "create own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid());

create policy "visible tips are public" on public.tips for select using (not hidden or author_id = auth.uid());
create policy "post tips" on public.tips for insert to authenticated with check (author_id = auth.uid());
create policy "delete own tips" on public.tips for delete to authenticated using (author_id = auth.uid());

create policy "votes are public" on public.tip_votes for select using (true);
create policy "vote" on public.tip_votes for insert to authenticated with check (user_id = auth.uid());
create policy "change own vote" on public.tip_votes for update to authenticated using (user_id = auth.uid());
create policy "remove own vote" on public.tip_votes for delete to authenticated using (user_id = auth.uid());

create policy "visible comments are public" on public.comments for select using (not hidden or author_id = auth.uid());
create policy "post comments" on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy "delete own comments" on public.comments for delete to authenticated using (author_id = auth.uid());

create policy "report content" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

-- Photo storage: public to view, users upload only into a folder named after their user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg']);

create policy "upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
