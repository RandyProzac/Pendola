alter table public.projects
  add column if not exists publication_settings jsonb not null default '{}'::jsonb;

alter table public.books
  add column if not exists publication_settings jsonb not null default '{}'::jsonb;
