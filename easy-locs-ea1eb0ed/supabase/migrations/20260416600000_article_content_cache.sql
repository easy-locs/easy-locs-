create table if not exists public.article_content_cache (
  url text primary key check (char_length(url) <= 2048),
  html text not null check (char_length(html) <= 500000),
  text_length integer not null check (text_length >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index idx_article_content_cache_expires_at on public.article_content_cache (expires_at);

alter table public.article_content_cache enable row level security;

create policy "Anyone can read cached articles"
  on public.article_content_cache for select
  using (true);

create policy "Authenticated users can insert cached articles"
  on public.article_content_cache for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update cached articles"
  on public.article_content_cache for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete expired cached articles"
  on public.article_content_cache for delete
  using (auth.role() = 'authenticated' and expires_at < now());
