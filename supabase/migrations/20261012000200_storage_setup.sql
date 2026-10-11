-- Sellfast: storage buckets and access policies.
-- Apply with `npx supabase db push` after placing this in supabase/migrations.
-- Seller upload path convention: <auth-user-uuid>/<listing-uuid>/<filename>.
-- Public watch image path convention: <listing-uuid>/<filename>.

begin;

-- Create purpose-specific buckets. Existing buckets are left unchanged so this
-- migration cannot silently change an existing bucket's visibility settings.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'seller-uploads',
    'seller-uploads',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'watch-images',
    'watch-images',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
  )
on conflict (id) do nothing;

-- Admins can manage every object in the private seller bucket.
create policy "Sellfast admins manage seller uploads"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'seller-uploads'
    and (select public.is_admin())
  )
  with check (
    bucket_id = 'seller-uploads'
    and (select public.is_admin())
  );

-- Approved sellers can upload only into their own first-level user-ID folder.
create policy "Approved sellers upload own images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'seller-uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.seller_profiles sp
      where sp.user_id = (select auth.uid())
        and sp.status = 'approved'
    )
  );

create policy "Approved sellers read own images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'seller-uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.seller_profiles sp
      where sp.user_id = (select auth.uid())
        and sp.status = 'approved'
    )
  );

create policy "Approved sellers update own images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'seller-uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.seller_profiles sp
      where sp.user_id = (select auth.uid())
        and sp.status = 'approved'
    )
  )
  with check (
    bucket_id = 'seller-uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.seller_profiles sp
      where sp.user_id = (select auth.uid())
        and sp.status = 'approved'
    )
  );

create policy "Approved sellers delete own images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'seller-uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.seller_profiles sp
      where sp.user_id = (select auth.uid())
        and sp.status = 'approved'
    )
  );

-- Only admins can write to the public bucket. Public bucket URLs can be read
-- without an object SELECT policy, so only approved images should be put here.
create policy "Sellfast admins manage public watch images"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'watch-images'
    and (select public.is_admin())
  )
  with check (
    bucket_id = 'watch-images'
    and (select public.is_admin())
  );

commit;
