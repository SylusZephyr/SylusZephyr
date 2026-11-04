-- Revive cloud schema. Run once in Supabase → SQL Editor.
-- Each signed-in user gets exactly one row holding their app state; RLS keeps it private.

create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb       not null,
  device_id  text,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

drop policy if exists "own state: read"   on public.user_state;
drop policy if exists "own state: insert" on public.user_state;
drop policy if exists "own state: update" on public.user_state;
drop policy if exists "own state: delete" on public.user_state;

create policy "own state: read"   on public.user_state for select using (auth.uid() = user_id);
create policy "own state: insert" on public.user_state for insert with check (auth.uid() = user_id);
create policy "own state: update" on public.user_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own state: delete" on public.user_state for delete using (auth.uid() = user_id);

-- Live updates between devices
alter table public.user_state replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.user_state;
exception when duplicate_object then null; end $$;


-- Published content: recipes, tips, stories and delivery ideas pushed to every install.
-- Anyone can read published rows; only the dashboard (service role) can write.
create table if not exists public.content (
  id         text primary key,
  kind       text        not null check (kind in ('recipe', 'tip', 'story', 'delivery')),
  data       jsonb       not null,
  published  boolean     not null default true,
  updated_at timestamptz not null default now()
);

alter table public.content enable row level security;
drop policy if exists "content: public read" on public.content;
create policy "content: public read" on public.content for select using (published);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists content_touch on public.content;
create trigger content_touch before update on public.content for each row execute function public.touch_updated_at();

-- Account deletion from inside the app (App Store / Play policy requirement).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.user_state where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
