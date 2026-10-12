import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowDown, ArrowUp, Check, ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/marketplace";
import {
  addSellerListingImages,
  deleteSellerListingImage,
  moveSellerListingImage,
  replaceSellerListingImage,
  setSellerListingCover,
} from "@/app/seller/actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; added?: string; replaced?: string; deleted?: string; cover?: string; ordered?: string }> };
type Photo = { id: string; listing_id: string; storage_bucket: "seller-uploads" | "watch-images"; storage_path: string; alt_text: string | null; position: number; is_primary: boolean };

const errorMessages: Record<string, string> = {
  locked: "This listing cannot be changed while reserved or sold.",
  files: "Choose JPEG, PNG or WebP images, up to 10 MB each. You can add up to eight at a time.",
  upload: "One or more images could not be uploaded. Check the file type and try again.",
  metadata: "The photo was uploaded, but its listing details could not be saved. Refresh and review the photos before retrying.",
  image: "That image could not be found on this listing.",
  "delete-storage": "The image file could not be removed. No listing details were deleted.",
  "delete-metadata": "The image file was removed, but its listing record could not be removed. Contact support before trying again.",
  cover: "The cover image could not be changed. Refresh the page and try again.",
  order: "The photo order could not be changed. Refresh and check the current order.",
  unpublish: "This listing could not be moved to review. No photo change was made.",
};

export default async function SellerListingImagesPage({ params, searchParams }: Props) {
  const { id } = await params;
  const q = await searchParams;
  if (!hasSupabaseConfig()) redirect("/auth/login");
  const db = await createClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) redirect("/auth/login?next=" + encodeURIComponent("/seller/listings/" + id + "/images"));

  const { data: profile } = await db.from("seller_profiles").select("status").eq("user_id", auth.user.id).maybeSingle();
  if (profile?.status !== "approved") redirect("/seller/dashboard?error=not-approved");

  const { data: listing } = await db.from("listings")
    .select("id,title,status,availability,listing_images(id,listing_id,storage_bucket,storage_path,alt_text,position,is_primary)")
    .eq("id", id).eq("seller_id", auth.user.id).maybeSingle();
  if (!listing) notFound();
  if (!["draft", "pending_review", "rejected", "published"].includes(listing.status)) notFound();

  const photos = ((listing.listing_images || []) as Photo[]).sort((a, b) => a.position - b.position);
  const cards = await Promise.all(photos.map(async (photo) => {
    if (photo.storage_bucket === "watch-images") {
      const { data } = db.storage.from("watch-images").getPublicUrl(photo.storage_path);
      return { ...photo, url: data.publicUrl };
    }
    const { data } = await db.storage.from("seller-uploads").createSignedUrl(photo.storage_path, 3600);
    return { ...photo, url: data?.signedUrl || "" };
  }));

  return <main className="container section seller-image-page">
    <div className="admin-heading">
      <div><div className="eyebrow">Seller workspace · Photo management</div><h1 className="display">Manage photographs</h1><p>{listing.title}</p></div>
      <Link href="/seller/dashboard" className="text-link"><ArrowLeft size={13}/> Back to dashboard</Link>
    </div>
    {q.error ? <div className="notice error">{errorMessages[q.error] || "The image change could not be completed. Refresh and try again."}</div> : null}
    {q.added ? <div className="notice"><Check size={16}/> Photographs added. The listing remains subject to moderation.</div> : null}
    {q.replaced ? <div className="notice"><Check size={16}/> Photograph replaced successfully.</div> : null}
    {q.deleted ? <div className="notice"><Check size={16}/> Photograph removed.</div> : null}
    {q.cover ? <div className="notice"><Check size={16}/> Cover photograph updated.</div> : null}
    {q.ordered ? <div className="notice"><Check size={16}/> Photograph order updated.</div> : null}

    {listing.status === "published" ? <div className="notice"><RefreshCw size={16}/> If you change, replace, remove or reorder a live photograph, the listing will temporarily return to review and disappear from the public shop until an administrator approves it again.</div> : null}
    {listing.status !== "published" ? <div className="upload-help">Status: <strong>{listing.status.replace("_", " ")}</strong>. Changes to photographs are made privately and remain subject to review before the watch is published.</div> : null}
    {listing.availability !== "available" ? <div className="notice error">This listing is {listing.availability}; photo changes are disabled until it is available again.</div> : <>
      <form action={addSellerListingImages} encType="multipart/form-data" className="admin-form" style={{maxWidth:"none",marginBottom:22}}>
        <input type="hidden" name="listing_id" value={listing.id}/>
        <div className="form-field"><label htmlFor="add-photos">Add photographs</label><input id="add-photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required/><span className="muted" style={{fontSize:10}}>JPEG, PNG or WebP. Up to eight files per upload, 10 MB per image.</span></div>
        <button className="button" type="submit"><ImagePlus size={15}/> Upload photographs</button>
      </form>

      {cards.length ? <div className="seller-photo-grid">
        {cards.map((photo, index) => <article className="seller-photo-card" key={photo.id}>
          <div className="seller-photo-preview">
            {photo.url ? <img src={photo.url} alt={photo.alt_text || listing.title + " photograph " + (index + 1)}/> : <div className="product-gallery-placeholder"><span>PHOTO PREVIEW</span><small>Preview unavailable. Refresh this page.</small></div>}
            {photo.is_primary ? <span className="photo-badge">Cover photo</span> : null}
          </div>
          <div className="seller-photo-info">
            <strong>Photo {index + 1}</strong><span>{photo.storage_bucket === "watch-images" ? "Currently published image" : "Private image"}</span>
            {photo.is_primary ? <span className="status-pill published">Cover</span> : <form action={setSellerListingCover}><input type="hidden" name="listing_id" value={listing.id}/><input type="hidden" name="image_id" value={photo.id}/><button className="mini-button primary" type="submit">Make cover</button></form>}
            <div className="inline-actions">
              {index > 0 ? <form action={moveSellerListingImage}><input type="hidden" name="listing_id" value={listing.id}/><input type="hidden" name="image_id" value={photo.id}/><input type="hidden" name="direction" value="up"/><button className="mini-button" type="submit" aria-label="Move photo earlier"><ArrowUp size={13}/> Move up</button></form> : null}
              {index < cards.length - 1 ? <form action={moveSellerListingImage}><input type="hidden" name="listing_id" value={listing.id}/><input type="hidden" name="image_id" value={photo.id}/><input type="hidden" name="direction" value="down"/><button className="mini-button" type="submit" aria-label="Move photo later"><ArrowDown size={13}/> Move down</button></form> : null}
            </div>
            <form action={replaceSellerListingImage} encType="multipart/form-data" className="seller-replace-form"><input type="hidden" name="listing_id" value={listing.id}/><input type="hidden" name="image_id" value={photo.id}/><label htmlFor={"replace-"+photo.id}>Replace this photo</label><input id={"replace-"+photo.id} type="file" name="photo" accept="image/jpeg,image/png,image/webp" required/><button className="mini-button" type="submit"><RefreshCw size={12}/> Replace</button></form>
            <form action={deleteSellerListingImage} onSubmit={undefined as never} className="seller-delete-form"><input type="hidden" name="listing_id" value={listing.id}/><input type="hidden" name="image_id" value={photo.id}/><button className="mini-button danger" type="submit"><Trash2 size={12}/> Delete photo</button></form>
          </div>
        </article>)}
      </div> : <div className="empty-state"><h3>No photographs yet.</h3><p>Add at least one good photograph. An administrator will need to review the listing before it appears in the public catalogue.</p></div>}
    </>}
  </main>;
}
