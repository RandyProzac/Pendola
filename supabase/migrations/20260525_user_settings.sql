create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ai_settings jsonb not null default '{}'::jsonb,
  writer_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_user_settings_user_id on public.user_settings(user_id);

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

drop policy if exists "user settings owner access" on public.user_settings;
create policy "user settings owner access"
on public.user_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
