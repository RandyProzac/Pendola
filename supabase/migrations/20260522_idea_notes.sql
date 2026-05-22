create table if not exists public.idea_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  title text not null default '',
  content text not null default '',
  color text not null default 'paper',
  x double precision not null default 48,
  y double precision not null default 64,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.idea_notes
  add column if not exists chapter_id uuid references public.chapters(id) on delete set null;

create index if not exists idx_idea_notes_project_id on public.idea_notes(project_id);
create index if not exists idx_idea_notes_chapter_id on public.idea_notes(chapter_id);

drop trigger if exists set_idea_notes_updated_at on public.idea_notes;
create trigger set_idea_notes_updated_at
before update on public.idea_notes
for each row execute function public.set_updated_at();

alter table public.idea_notes enable row level security;

drop policy if exists "idea_notes owner access" on public.idea_notes;
create policy "idea_notes owner access"
on public.idea_notes
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
