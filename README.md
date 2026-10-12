# Sellfast — Luxury Watch Marketplace

An enquiry-led luxury-watch marketplace built with Next.js, TypeScript, Supabase Auth, PostgreSQL and Storage.

## Product model
- Platform-owned inventory and approved third-party inventory share one catalogue.
- Only published and available listings appear in catalogue search.
- Seller applications and individual listings require moderation.
- Buyer enquiries are private; buyers can also start a WhatsApp conversation.
- Online checkout, escrow and payouts are not part of the initial release.

## Local development
1. Install Node.js 22 or later.
2. Copy `.env.example` to `.env.local` and set the Supabase URL and publishable key.
3. Run `npm install`, then `npm run dev`.
4. Open http://localhost:3000.

## Main routes
- `/` storefront
- `/watches` live catalogue and filters
- `/watches/[slug]` listing detail and enquiry
- `/sell-your-watch` sell/trade enquiries
- `/become-a-seller` seller application
- `/seller/dashboard` seller workspace\n- `/seller/listings/[id]/images` seller photo manager (add, replace, delete, reorder, choose cover)
- `/admin` administrator overview and inventory tools
- `/admin/sellers` seller approvals
- `/admin/inquiries` lead management
- `/admin/brands` brand management\n- `/admin/blog` SEO journal, drafts and publishing\n- `/blog` public article journal\n- `/blog/[slug]` public SEO-friendly article

## Database and security
Schema and Storage migrations are in `supabase/migrations`. The core marketplace migrations have been applied to the current Supabase project. Before using the SEO journal, apply `supabase/migrations/20261012000300_blog_posts.sql` once in Supabase SQL Editor. For seller photo management, also apply `supabase/migrations/20261012000400_seller_image_management.sql` once. For explicit unknown/not-applicable production years and watch set contents, apply `supabase/migrations/20261012000500_listing_year_and_set_contents.sql` once. Do not rerun migrations already applied; add a timestamped migration for future schema changes. The blog migration grants public read access only to published articles and admin-only write access through the `is_admin()` policy. The seller image migration allows approved sellers to manage photos on their own available listings while keeping storage identity protected. Changing images on a live listing moves it to `pending_review` until an admin republishes it.

Before production, test with anonymous, approved seller, unapproved seller and administrator accounts. Verify row-level access, storage paths, image publication, email confirmation, rate-limiting and backups.

## Hostinger
Configure variables from `.env.example` in the hosting panel, set `NEXT_PUBLIC_SITE_URL` to the production HTTPS URL, and set `NEXT_PUBLIC_WHATSAPP_NUMBER`. Build with `npm run build` and use Hostinger's Node.js deployment workflow. Never expose a Supabase service-role key in any browser-visible variable.
