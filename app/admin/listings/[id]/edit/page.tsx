import Link from "next/link";
import { ArrowLeft, ArrowDown, ArrowUp, Check, ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/listing-form";
import {
  addAdminListingImages,
  deleteAdminListingImage,
  moveAdminListingImage,
  replaceAdminListingImage,
  setAdminListingCover,
  updateAdminListing,
} from "./actions";

type Props = { params: Promise<{id:string}>; searchParams: Promise<{error?:string;photos?:string}> };
type ImageRow = { id:string; storage_bucket:"seller-uploads"|"watch-images"; storage_path:string; position:number; is_primary:boolean; alt_text:string|null };
const errors: Record<string,string> = {
  details:"Check the required listing details.",
  save:"Listing details could not be saved.",
  images:"Image metadata could not be saved.",
  upload:"An image could not be uploaded. Check the file type and size.",
  publish:"The listing could not be published.",
  "photo-locked":"Photos cannot be changed while a listing is reserved or sold.",
  "photo-files":"Choose JPEG, PNG or WebP images up to 10 MB each. Upload up to four at a time.",
  "photo-upload":"The image could not be uploaded.",
  "photo-metadata":"The image record could not be saved. Refresh the page and check the current images.",
  "photo-missing":"The selected photo could not be found.",
  "photo-cover":"The cover photo could not be changed.",
  "photo-order":"The photo order could not be changed.",
};

export default async function EditAdminListingPage({params,searchParams}:Props) {
  const {id} = await params;
  const p = await searchParams;
  const db = await createClient();
  const [{data:row},{data:brands},{data:rawImages}] = await Promise.all([
    db.from("listings").select("*").eq("id",id).maybeSingle(),
    db.from("brands").select("id,name").order("sort_order"),
    db.from("listing_images").select("id,storage_bucket,storage_path,position,is_primary,alt_text").eq("listing_id",id).order("position"),
  ]);
  if (!row) notFound();

  const defaults:Record<string,string> = Object.fromEntries(
    ["brand_id","title","model","reference_number","year","price_aed","price_on_request","condition","movement","calibre","case_size_mm","case_material","dial_color","bracelet_material","warranty_info","description","box_included","papers_included"]
      .map(key => [key,row[key]===null||row[key]===undefined ? "" : String(row[key])])
  );
  const images = await Promise.all(((rawImages||[]) as ImageRow[]).map(async image => {
    if (image.storage_bucket === "watch-images") {
      const {data} = db.storage.from("watch-images").getPublicUrl(image.storage_path);
      return {...image,url:data.publicUrl};
    }
    const {data} = await db.storage.from("seller-uploads").createSignedUrl(image.storage_path,3600);
    return {...image,url:data?.signedUrl||""};
  }));
  const photoMessage = p.photos==="added" ? "Photographs added." :
    p.photos==="replaced" ? "Photograph replaced." :
    p.photos==="deleted" ? "Photograph deleted." :
    p.photos==="cover" ? "Cover photograph updated." :
    p.photos==="ordered" ? "Photograph order updated." : "";

  return <>
    <div className="admin-heading">
      <div><div className="eyebrow">Inventory control</div><h1>Edit watch</h1><p>Manage listing details and every photograph in this inventory record.</p></div>
      <Link href="/admin/listings" className="text-link"><ArrowLeft size={13}/> Back to inventory</Link>
    </div>
    {p.error ? <div className="notice error">{errors[p.error]||"Could not complete the requested change. Refresh and try again."}</div> : null}
    {photoMessage ? <div className="notice"><Check size={16}/>{photoMessage}</div> : null}

    <section className="admin-photo-manager">
      <div className="admin-photo-heading">
        <div><div className="eyebrow">Inventory media</div><h2>Watch photographs</h2><p>{images.length} photo{images.length===1?"":"s"} · Select a cover, change the order, replace or remove individual images.</p></div>
      </div>
      <form action={addAdminListingImages} encType="multipart/form-data" className="admin-photo-add">
        <input type="hidden" name="listing_id" value={id}/>
        <div className="form-field"><label htmlFor="admin-add-photos">Add photographs</label><input id="admin-add-photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required/><span className="muted" style={{fontSize:10}}>JPEG, PNG or WebP · up to 10 MB each · four files per upload.</span></div>
        <button className="button" type="submit"><ImagePlus size={15}/> Add photos</button>
      </form>
      {images.length ? <div className="admin-photo-grid">
        {images.map((image,index) => <article className="admin-photo-card" key={image.id}>
          <div className="admin-photo-preview">
            {image.url ? <img src={image.url} alt={image.alt_text||row.title+" photo "+(index+1)}/> : <div className="product-gallery-placeholder"><span>PHOTO PREVIEW</span><small>Unable to load preview. Refresh the page.</small></div>}
            {image.is_primary ? <span className="photo-badge">Cover photo</span> : null}
          </div>
          <div className="admin-photo-info">
            <div className="admin-photo-title"><strong>Photo {index+1}</strong><span>{image.storage_bucket==="watch-images"?"Public image":"Private image"}</span></div>
            {image.is_primary ? <span className="status-pill published">Current cover</span> : <form action={setAdminListingCover}><input type="hidden" name="listing_id" value={id}/><input type="hidden" name="image_id" value={image.id}/><button className="mini-button primary" type="submit">Make cover</button></form>}
            <div className="inline-actions">
              {index>0 ? <form action={moveAdminListingImage}><input type="hidden" name="listing_id" value={id}/><input type="hidden" name="image_id" value={image.id}/><input type="hidden" name="direction" value="up"/><button className="mini-button" type="submit"><ArrowUp size={12}/> Move up</button></form> : null}
              {index<images.length-1 ? <form action={moveAdminListingImage}><input type="hidden" name="listing_id" value={id}/><input type="hidden" name="image_id" value={image.id}/><input type="hidden" name="direction" value="down"/><button className="mini-button" type="submit"><ArrowDown size={12}/> Move down</button></form> : null}
            </div>
            <form action={replaceAdminListingImage} encType="multipart/form-data" className="admin-photo-replace">
              <input type="hidden" name="listing_id" value={id}/><input type="hidden" name="image_id" value={image.id}/>
              <label htmlFor={"admin-replace-"+image.id}>Replace photograph</label>
              <input id={"admin-replace-"+image.id} name="photo" type="file" accept="image/jpeg,image/png,image/webp" required/>
              <button className="mini-button" type="submit"><RefreshCw size={12}/> Replace</button>
            </form>
            <form action={deleteAdminListingImage} className="admin-photo-delete">
              <input type="hidden" name="listing_id" value={id}/><input type="hidden" name="image_id" value={image.id}/>
              <button className="mini-button danger" type="submit"><Trash2 size={12}/> Delete photo</button>
            </form>
          </div>
        </article>)}
      </div> : <div className="empty-state"><h3>No photographs yet.</h3><p>Use Add photographs above to attach images to this watch.</p></div>}
      {row.status==="published" ? <p className="admin-photo-footnote">As an administrator, your photo changes are applied to this listing directly. Review the public product page after updating its gallery.</p> : null}
    </section>

    <div className="admin-heading" style={{marginTop:34}}><div><div className="eyebrow">Listing details</div><h2 className="display" style={{fontSize:32}}>Product information</h2><p>Current listing status: <strong>{row.status}</strong></p></div></div>
    <ListingForm brands={brands||[]} action={updateAdminListing} defaults={defaults} submitLabel="Save listing details" allowPublish={true} showPublishToggle={false} hidePhotoField={true}/>
  </>;
}
