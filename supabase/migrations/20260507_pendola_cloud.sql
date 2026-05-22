create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null,
  genre text not null default '',
  premise text not null default '',
  theme text not null default '',
  anti_theme text not null default '',
  creative_profile text not null default '',
  ai_instructions text not null default '',
  editorial_instructions text not null default '',
  cover_color text not null default '#534AB7',
  cover_image_path text,
  status text not null default 'planificando',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  "order" integer not null default 1,
  synopsis text not null default '',
  status text not null default 'borrador',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  title text not null,
  "order" integer not null default 1,
  synopsis text not null default '',
  cover_image_path text,
  content text not null default '',
  beat_number integer,
  word_count integer not null default 0,
  tracked_writing_seconds integer not null default 0,
  last_writing_at timestamptz,
  status text not null default 'borrador',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.editorial_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  content text not null default '',
  word_count integer not null default 0,
  source_chapter_updated_at timestamptz not null,
  source_snapshot_content text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chapter_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  editorial_draft_id uuid references public.editorial_drafts(id) on delete set null,
  workspace text not null,
  chapter_title text not null,
  content text not null,
  word_count integer not null default 0,
  reason text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  age integer,
  image_url text,
  physical_description text,
  drive text not null default '',
  wish text not null default '',
  void text not null default '',
  vice text not null default '',
  origin text not null default '',
  persona text not null default '',
  expedition text not null default '',
  attributes jsonb not null default '{}'::jsonb,
  traits jsonb not null default '{}'::jsonb,
  value_sector text not null default '',
  dominant_value text not null default '',
  archetypes jsonb not null default '{}'::jsonb,
  relationships jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  type text not null default 'otro',
  description text not null default '',
  atmosphere text not null default '',
  narrative_importance text not null default '',
  associated_character_ids text[] not null default '{}',
  image_url text,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  file_type text not null default 'other',
  file_data text,
  media_path text,
  extracted_content text,
  extraction_method text,
  description text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.entity_mentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  book_id uuid references public.books(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  text text not null,
  from_position integer,
  to_position integer,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  workspace text not null default 'writing',
  mode text not null default 'copiloto',
  title text not null default 'Nueva conversación',
  archived_at timestamptz,
  last_message_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  mode text,
  response_type text,
  insertable boolean,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_books_project_id on public.books(project_id);
create index if not exists idx_chapters_book_id on public.chapters(book_id);
create index if not exists idx_editorial_drafts_chapter_id on public.editorial_drafts(chapter_id);
create index if not exists idx_chapter_snapshots_chapter_id on public.chapter_snapshots(chapter_id);
create index if not exists idx_characters_project_id on public.characters(project_id);
create index if not exists idx_scenarios_project_id on public.scenarios(project_id);
create index if not exists idx_resources_project_id on public.resources(project_id);
create index if not exists idx_entity_mentions_chapter_id on public.entity_mentions(chapter_id);
create index if not exists idx_ai_conversations_project_id on public.ai_conversations(project_id);
create index if not exists idx_ai_conversations_last_message_at on public.ai_conversations(last_message_at);
create index if not exists idx_ai_messages_conversation_id on public.ai_messages(conversation_id);

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_books_updated_at on public.books;
create trigger set_books_updated_at
before update on public.books
for each row execute function public.set_updated_at();

drop trigger if exists set_chapters_updated_at on public.chapters;
create trigger set_chapters_updated_at
before update on public.chapters
for each row execute function public.set_updated_at();

drop trigger if exists set_editorial_drafts_updated_at on public.editorial_drafts;
create trigger set_editorial_drafts_updated_at
before update on public.editorial_drafts
for each row execute function public.set_updated_at();

drop trigger if exists set_characters_updated_at on public.characters;
create trigger set_characters_updated_at
before update on public.characters
for each row execute function public.set_updated_at();

drop trigger if exists set_scenarios_updated_at on public.scenarios;
create trigger set_scenarios_updated_at
before update on public.scenarios
for each row execute function public.set_updated_at();

drop trigger if exists set_ai_conversations_updated_at on public.ai_conversations;
create trigger set_ai_conversations_updated_at
before update on public.ai_conversations
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.books enable row level security;
alter table public.chapters enable row level security;
alter table public.editorial_drafts enable row level security;
alter table public.chapter_snapshots enable row level security;
alter table public.characters enable row level security;
alter table public.scenarios enable row level security;
alter table public.resources enable row level security;
alter table public.entity_mentions enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

drop policy if exists "projects owner access" on public.projects;
create policy "projects owner access"
on public.projects
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "books owner access" on public.books;
create policy "books owner access"
on public.books
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "chapters owner access" on public.chapters;
create policy "chapters owner access"
on public.chapters
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "editorial drafts owner access" on public.editorial_drafts;
create policy "editorial drafts owner access"
on public.editorial_drafts
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "chapter snapshots owner access" on public.chapter_snapshots;
create policy "chapter snapshots owner access"
on public.chapter_snapshots
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "characters owner access" on public.characters;
create policy "characters owner access"
on public.characters
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "scenarios owner access" on public.scenarios;
create policy "scenarios owner access"
on public.scenarios
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "resources owner access" on public.resources;
create policy "resources owner access"
on public.resources
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "entity mentions owner access" on public.entity_mentions;
create policy "entity mentions owner access"
on public.entity_mentions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "ai conversations owner access" on public.ai_conversations;
create policy "ai conversations owner access"
on public.ai_conversations
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "ai messages owner access" on public.ai_messages;
create policy "ai messages owner access"
on public.ai_messages
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
