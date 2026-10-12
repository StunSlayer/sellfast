-- Sellfast SEO blog: admin-managed posts with public read access for published articles only.
begin;

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  title text not null check (char_length(trim(title)) between 5 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt text not null check (char_length(trim(excerpt)) between 30 and 320),
  content text not null check (char_length(trim(content)) >= 100),
  category text not null default 'Watch guides' check (char_length(trim(category)) between 2 and 80),
  tags text[] not null default '{}',
  cover_image_url text,
  seo_title text,
  seo_description text,
  canonical_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_published_has_date check (status <> 'published' or published_at is not null)
);

create index blog_posts_publication_idx
  on public.blog_posts(status, published_at desc);
create index blog_posts_category_idx
  on public.blog_posts(category, published_at desc);

alter table public.blog_posts enable row level security;
revoke all on table public.blog_posts from anon, authenticated;
grant select on table public.blog_posts to anon, authenticated;
grant insert, update, delete on table public.blog_posts to authenticated;

create policy "Public reads published blog posts"
  on public.blog_posts for select to anon, authenticated
  using (status = 'published' and published_at is not null);

create policy "Admins manage blog posts"
  on public.blog_posts for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create trigger blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

commit;
