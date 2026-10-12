-- Allow approved sellers to manage photos attached to their own listings.
-- Editing a live listing first moves it back to pending_review so changes are not
-- silently published. Admins remain the only role that can publish photos.

begin;

drop policy if exists "Sellers edit own unapproved listings" on public.listings;
create policy "Sellers edit own listings for moderation"
  on public.listings for update to authenticated
  using (
    seller_id = (select auth.uid())
    and status in ('draft', 'pending_review', 'rejected', 'published')
    and availability = 'available'
    and exists (
      select 1 from public.seller_profiles sp
      where sp.user_id = (select auth.uid()) and sp.status = 'approved'
    )
  )
  with check (
    seller_id = (select auth.uid())
    and created_by = (select auth.uid())
    and status in ('draft', 'pending_review', 'rejected')
    and availability = 'available'
    and exists (
      select 1 from public.seller_profiles sp
      where sp.user_id = (select auth.uid()) and sp.status = 'approved'
    )
  );

drop policy if exists "Sellers read own private image metadata" on public.listing_images;
create policy "Sellers read own image metadata"
  on public.listing_images for select to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = (select auth.uid())
        and l.status in ('draft', 'pending_review', 'rejected', 'published')
    )
  );

drop policy if exists "Sellers edit own private image metadata" on public.listing_images;
create policy "Sellers edit own image metadata during moderation"
  on public.listing_images for update to authenticated
  using (
    storage_bucket in ('seller-uploads', 'watch-images')
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = (select auth.uid())
        and l.status in ('draft', 'pending_review', 'rejected')
        and l.availability = 'available'
    )
  )
  with check (
    storage_bucket in ('seller-uploads', 'watch-images')
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = (select auth.uid())
        and l.status in ('draft', 'pending_review', 'rejected')
        and l.availability = 'available'
    )
  );

drop policy if exists "Sellers delete own private image metadata" on public.listing_images;
create policy "Sellers delete own image metadata during moderation"
  on public.listing_images for delete to authenticated
  using (
    storage_bucket in ('seller-uploads', 'watch-images')
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = (select auth.uid())
        and l.status in ('draft', 'pending_review', 'rejected')
        and l.availability = 'available'
    )
  );

-- Public-bucket objects for a seller listing can only be removed by that listing's
-- approved owner after the listing is unpublished for moderation.
create policy "Approved sellers delete own unpublished watch images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'watch-images'
    and (storage.foldername(name))[1] is not null
    and exists (
      select 1
      from public.listings l
      join public.seller_profiles sp on sp.user_id = l.seller_id
      where l.id::text = (storage.foldername(name))[1]
        and l.seller_id = (select auth.uid())
        and l.status in ('draft', 'pending_review', 'rejected')
        and l.availability = 'available'
        and sp.status = 'approved'
    )
  );

-- Sellers may change cover/order/alt text, but must not point their metadata at a
-- different listing or object. Admin publish operations are allowed to change paths.
create or replace function public.protect_seller_listing_image_storage_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then
    if new.listing_id is distinct from old.listing_id
      or new.storage_bucket is distinct from old.storage_bucket
      or new.storage_path is distinct from old.storage_path then
      raise exception 'Sellers cannot change image storage identity';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_seller_listing_image_storage_identity on public.listing_images;
create trigger protect_seller_listing_image_storage_identity
  before update on public.listing_images
  for each row execute function public.protect_seller_listing_image_storage_identity();

commit;
