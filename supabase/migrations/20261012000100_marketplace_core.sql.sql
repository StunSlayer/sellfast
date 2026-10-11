-- Sellfast luxury watch marketplace: core schema
-- Apply once in Supabase SQL Editor. Review and version this file in Git.
-- Storage buckets and storage.objects policies are configured separately.

begin;

-- Brands
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  logo_path text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Privileged platform roles. Do not grant direct table access to browser clients.
create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Seller applications and approved seller profiles.
create table public.seller_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  company_name text,
  contact_phone text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Platform and third-party inventory share this table.
-- seller_id NULL means platform-owned stock. Non-NULL means seller-owned listing.
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.seller_profiles(user_id) on delete restrict,
  created_by uuid not null references auth.users(id),
  brand_id uuid not null references public.brands(id),
  slug text not null unique,
  title text not null check (char_length(trim(title)) between 3 and 180),
  model text not null,
  reference_number text,
  price_aed numeric(12,2) check (price_aed is null or price_aed >= 0),
  price_on_request boolean not null default false,
  year smallint check (year is null or year between 1900 and 2100),
  condition text not null
    check (condition in ('new', 'unworn', 'excellent', 'very_good', 'good', 'fair')),
  movement text,
  calibre text,
  case_size_mm numeric(5,2) check (case_size_mm is null or case_size_mm > 0),
  case_material text,
  dial_color text,
  bracelet_material text,
  box_included boolean not null default false,
  papers_included boolean not null default false,
  warranty_info text,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  availability text not null default 'available'
    check (availability in ('available', 'reserved', 'sold')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listing_price_required
    check (price_aed is not null or price_on_request = true)
);

-- Image metadata only. Actual files live in Supabase Storage.
create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_bucket text not null check (storage_bucket in ('seller-uploads', 'watch-images')),
  storage_path text not null,
  alt_text text,
  position integer not null default 0 check (position >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (listing_id, position),
  unique (storage_bucket, storage_path)
);

create unique index listing_images_one_primary_idx
  on public.listing_images(listing_id) where is_primary = true;

-- Public submissions are private after insertion; only admins can read/manage leads.
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  inquiry_type text not null default 'buy_listing'
    check (inquiry_type in ('buy_listing', 'sell_watch', 'trade', 'general')),
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  email text,
  phone text,
  message text not null check (char_length(trim(message)) between 1 and 5000),
  submitted_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'closed', 'spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inquiry_requires_contact
    check (nullif(trim(email), '') is not null or nullif(trim(phone), '') is not null)
);

-- Indexes for catalogue/filtering and admin enquiry queue.
create index listings_catalogue_idx
  on public.listings(status, availability, published_at desc);
create index listings_brand_idx on public.listings(brand_id);
create index listings_price_idx on public.listings(price_aed);
create index listings_seller_idx on public.listings(seller_id);
create index listings_reference_idx on public.listings(reference_number);
create index listing_images_order_idx on public.listing_images(listing_id, position);
create index inquiries_queue_idx on public.inquiries(status, created_at desc);

-- updated_at maintenance.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();
create trigger seller_profiles_updated_at
  before update on public.seller_profiles
  for each row execute function public.set_updated_at();
create trigger listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();
create trigger inquiries_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

-- Enable Row Level Security.
alter table public.brands enable row level security;
alter table public.user_roles enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.inquiries enable row level security;

-- Explicit client privileges. RLS policies below restrict which rows are accessible.
revoke all on table public.brands, public.user_roles, public.seller_profiles,
  public.listings, public.listing_images, public.inquiries from anon, authenticated;

grant select on table public.brands to anon, authenticated;
grant insert, update, delete on table public.brands to authenticated;

grant select, insert, update on table public.seller_profiles to authenticated;

grant select on table public.listings to anon, authenticated;
grant insert, update, delete on table public.listings to authenticated;

grant select on table public.listing_images to anon, authenticated;
grant insert, update, delete on table public.listing_images to authenticated;

grant insert on table public.inquiries to anon, authenticated;
grant select, update, delete on table public.inquiries to authenticated;

-- Brands: public can read active brands; admins can manage all brands.
create policy "Public reads active brands"
  on public.brands for select to anon, authenticated
  using (is_active = true);
create policy "Admins manage brands"
  on public.brands for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Roles: no direct browser policies or grants. is_admin() is the read interface.

-- Seller profiles: users can see their own profile; admins manage all profiles.
create policy "Users read own seller profile"
  on public.seller_profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users apply as sellers"
  on public.seller_profiles for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
  );
create policy "Users update own unapproved application"
  on public.seller_profiles for update to authenticated
  using (user_id = (select auth.uid()) and status in ('pending', 'rejected'))
  with check (user_id = (select auth.uid()) and status in ('pending', 'rejected'));
create policy "Admins manage seller profiles"
  on public.seller_profiles for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Listings: visitors can only see published listings.
create policy "Public reads published listings"
  on public.listings for select to anon, authenticated
  using (status = 'published');
create policy "Sellers read own listings"
  on public.listings for select to authenticated
  using (seller_id = (select auth.uid()));
create policy "Approved sellers submit listings"
  on public.listings for insert to authenticated
  with check (
    seller_id = (select auth.uid())
    and created_by = (select auth.uid())
    and status in ('draft', 'pending_review')
    and availability = 'available'
    and exists (
      select 1 from public.seller_profiles sp
      where sp.user_id = (select auth.uid()) and sp.status = 'approved'
    )
  );
create policy "Sellers edit own unapproved listings"
  on public.listings for update to authenticated
  using (
    seller_id = (select auth.uid())
    and status in ('draft', 'pending_review', 'rejected')
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
create policy "Admins manage listings"
  on public.listings for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Image metadata: only public-bucket references for published listings are public.
create policy "Public reads published listing images"
  on public.listing_images for select to anon, authenticated
  using (
    storage_bucket = 'watch-images'
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status = 'published'
    )
  );
create policy "Sellers read own private image metadata"
  on public.listing_images for select to authenticated
  using (
    storage_bucket = 'seller-uploads'
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = (select auth.uid())
    )
  );
create policy "Approved sellers add private images to own drafts"
  on public.listing_images for insert to authenticated
  with check (
    storage_bucket = 'seller-uploads'
    and exists (
      select 1 from public.listings l
      join public.seller_profiles sp on sp.user_id = l.seller_id
      where l.id = listing_id
        and l.seller_id = (select auth.uid())
        and l.status in ('draft', 'pending_review', 'rejected')
        and sp.status = 'approved'
    )
  );
create policy "Sellers edit own private image metadata"
  on public.listing_images for update to authenticated
  using (
    storage_bucket = 'seller-uploads'
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = (select auth.uid())
        and l.status in ('draft', 'pending_review', 'rejected')
    )
  )
  with check (
    storage_bucket = 'seller-uploads'
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = (select auth.uid())
        and l.status in ('draft', 'pending_review', 'rejected')
    )
  );
create policy "Sellers delete own private image metadata"
  on public.listing_images for delete to authenticated
  using (
    storage_bucket = 'seller-uploads'
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = (select auth.uid())
        and l.status in ('draft', 'pending_review', 'rejected')
    )
  );
create policy "Admins manage listing images"
  on public.listing_images for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Enquiries: public can create a lead but cannot read lead data. Admins manage leads.
create policy "Visitors submit enquiries"
  on public.inquiries for insert to anon, authenticated
  with check (
    status = 'new'
    and assigned_to is null
    and (submitted_by is null or submitted_by = (select auth.uid()))
    and (
      listing_id is null
      or exists (
        select 1 from public.listings l
        where l.id = listing_id
          and l.status = 'published'
          and l.availability <> 'sold'
      )
    )
  );
create policy "Admins manage enquiries"
  on public.inquiries for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Starter brands.
insert into public.brands (name, slug, sort_order) values
  ('Rolex', 'rolex', 1),
  ('Patek Philippe', 'patek-philippe', 2),
  ('Audemars Piguet', 'audemars-piguet', 3),
  ('Cartier', 'cartier', 4),
  ('Omega', 'omega', 5),
  ('Tudor', 'tudor', 6),
  ('Richard Mille', 'richard-mille', 7),
  ('IWC Schaffhausen', 'iwc-schaffhausen', 8),
  ('Breitling', 'breitling', 9),
  ('TAG Heuer', 'tag-heuer', 10),
  ('Jaeger-LeCoultre', 'jaeger-lecoultre', 11),
  ('Vacheron Constantin', 'vacheron-constantin', 12)
on conflict (slug) do nothing;

commit;
