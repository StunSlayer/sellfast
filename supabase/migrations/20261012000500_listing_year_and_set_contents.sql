-- Capture year certainty and watch set contents explicitly, without guessing from blanks.
begin;

alter table public.listings
  add column if not exists year_status text not null default 'unknown',
  add column if not exists set_contents text not null default 'unknown',
  add column if not exists set_contents_notes text;

alter table public.listings
  drop constraint if exists listings_year_status_check,
  add constraint listings_year_status_check
    check (year_status in ('known', 'unknown', 'not_applicable')),
  drop constraint if exists listings_set_contents_check,
  add constraint listings_set_contents_check
    check (set_contents in ('full_set', 'watch_only', 'box_only', 'papers_only', 'other', 'unknown'));

-- Backfill only values that can be inferred from existing rows.
update public.listings
set year_status = case when year is not null then 'known' else 'unknown' end;

update public.listings
set set_contents = case
  when box_included and papers_included then 'full_set'
  when box_included and not papers_included then 'box_only'
  when papers_included and not box_included then 'papers_only'
  else 'unknown'
end;

-- Keep the legacy booleans consistent whenever the new set selector changes.
create or replace function public.sync_listing_set_contents()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.year_status <> 'known' then
    new.year := null;
  end if;

  if new.set_contents = 'full_set' then
    new.box_included := true;
    new.papers_included := true;
    new.set_contents_notes := null;
  elsif new.set_contents = 'watch_only' then
    new.box_included := false;
    new.papers_included := false;
    new.set_contents_notes := null;
  elsif new.set_contents = 'box_only' then
    new.box_included := true;
    new.papers_included := false;
    new.set_contents_notes := null;
  elsif new.set_contents = 'papers_only' then
    new.box_included := false;
    new.papers_included := true;
    new.set_contents_notes := null;
  elsif new.set_contents = 'unknown' then
    new.box_included := false;
    new.papers_included := false;
    new.set_contents_notes := null;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_listing_set_contents on public.listings;
create trigger sync_listing_set_contents
  before insert or update of year, year_status, set_contents, set_contents_notes
  on public.listings
  for each row execute function public.sync_listing_set_contents();

commit;
