alter table public.idea_notes
  add column if not exists chapter_id uuid references public.chapters(id) on delete set null;

create index if not exists idx_idea_notes_chapter_id on public.idea_notes(chapter_id);
