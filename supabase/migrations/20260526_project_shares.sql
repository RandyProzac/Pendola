create table if not exists public.project_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  token text not null unique,
  is_active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_project_shares_project_id
  on public.project_shares(project_id);

create index if not exists idx_project_shares_user_id
  on public.project_shares(user_id);

drop trigger if exists set_project_shares_updated_at on public.project_shares;
create trigger set_project_shares_updated_at
before update on public.project_shares
for each row execute function public.set_updated_at();

alter table public.project_shares enable row level security;

drop policy if exists "project shares owner access" on public.project_shares;
create policy "project shares owner access"
on public.project_shares
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.get_public_project_read_model(share_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  share_record public.project_shares%rowtype;
begin
  select *
  into share_record
  from public.project_shares
  where token = share_token
    and is_active = true
  limit 1;

  if not found then
    return null;
  end if;

  return (
    select jsonb_build_object(
      'project',
      jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'premise', p.premise,
        'genre', p.genre,
        'coverColor', p.cover_color,
        'coverImagePath', p.cover_image_path,
        'authorName', coalesce(p.publication_settings->>'authorName', ''),
        'penName', coalesce(p.publication_settings->>'penName', ''),
        'updatedAt', p.updated_at
      ),
      'books',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', b.id,
            'title', b.title,
            'order', b."order"
          )
          order by b."order"
        )
        from public.books b
        where b.project_id = p.id
      ), '[]'::jsonb),
      'chapters',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'bookId', c.book_id,
            'title', c.title,
            'order', c."order",
            'content', c.content,
            'wordCount', c.word_count
          )
          order by b."order", c."order"
        )
        from public.chapters c
        join public.books b on b.id = c.book_id
        where c.project_id = p.id
      ), '[]'::jsonb)
    )
    from public.projects p
    where p.id = share_record.project_id
  );
end;
$$;

grant execute on function public.get_public_project_read_model(text) to anon, authenticated;
