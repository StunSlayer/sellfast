-- Admin-managed homepage images for the hero and sell/trade feature.
begin;

create table public.homepage_media (
  slot text primary key check (slot in ('hero', 'sell_feature')),
  storage_path text not null,
  alt_text text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.homepage_media enable row level security;
revoke all on table public.homepage_media from anon, authenticated;
grant select on table public.homepage_media to anon, authenticated;
grant insert, update, delete on table public.homepage_media to authenticated;

create policy "Public reads homepage media"
  on public.homepage_media for select to anon, authenticated
  using (true);

create policy "Admins manage homepage media"
  on public.homepage_media for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create trigger homepage_media_updated_at
  before update on public.homepage_media
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do nothing;

create policy "Sellfast admins manage site media"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'site-media'
    and (select public.is_admin())
  )
  with check (
    bucket_id = 'site-media'
    and (select public.is_admin())
  );

commit;
