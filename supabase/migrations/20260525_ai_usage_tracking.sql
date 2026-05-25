alter table public.ai_messages
add column if not exists usage jsonb;
