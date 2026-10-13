"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/marketplace";
async function adminClient(){
 const db=await createClient(),{data}=await db.auth.getUser();if(!data.user)redirect("/auth/login?next=/admin");
 const {data:isAdmin}=await db.rpc("is_admin");if(isAdmin!==true)redirect("/");
 return {db,user:data.user};
}
function text(f:FormData,k:string,max=5000){return String(f.get(k)||"").trim().slice(0,max)}
function number(f:FormData,k:string){const v=text(f,k,40);if(!v)return null;const n=Number(v);return Number.isFinite(n)?n:null}
function fileName(v:string){return v.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"-").slice(-100)||"watch-image"}
export async function updateAdminListing(form:FormData){
 const {db,user}=await adminClient(),id=text(form,"listing_id",60);if(!id)redirect("/admin/listings");
 const {data:old}=await db.from("listings").select("id,slug,status").eq("id",id).maybeSingle();if(!old)redirect("/admin/listings?error=missing");
 const title=text(form,"title",180),model=text(form,"model",180),brand_id=text(form,"brand_id",60),price_aed=number(form,"price_aed"),price_on_request=text(form,"price_on_request",5)==="true";
 const rawYearStatus=text(form,"year_status",30),year_status=["known","unknown","not_applicable"].includes(rawYearStatus)?rawYearStatus:"unknown";
 const year=year_status==="known"?number(form,"year"):null;
 const rawMovement=text(form,"movement",30).toLowerCase(),movement=rawMovement==="automatic"?"Automatic":rawMovement==="manual"?"Manual winding":rawMovement==="quartz"?"Quartz":rawMovement==="other"?(text(form,"movement_other",100)||"Other"):"Unknown";
 const rawContents=text(form,"set_contents",30),set_contents=["full_set","watch_only","box_only","papers_only","other","unknown"].includes(rawContents)?rawContents:"unknown";
 const set_contents_notes=set_contents==="other"?(text(form,"set_contents_notes",250)||null):null;
 if(title.length<3||!model||!brand_id||(!price_on_request&&price_aed===null)||(year_status==="known"&&(year===null||year<1900||year>2100)))redirect("/admin/listings/"+id+"/edit?error=details");
 const files=form.getAll("photos").filter((v):v is File=>typeof v==="object"&&v!==null&&"size" in v&&(v as File).size>0);
 for(const f of files)if(!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>10*1024*1024)redirect("/admin/listings/"+id+"/edit?error=images");
 const {error:saveError}=await db.from("listings").update({
  brand_id,title,model,reference_number:text(form,"reference_number",120)||null,price_aed,price_on_request,year,year_status,
  condition:text(form,"condition",30)||"excellent",movement,calibre:text(form,"calibre",100)||null,
  case_size_mm:number(form,"case_size_mm"),case_material:text(form,"case_material",100)||null,dial_color:text(form,"dial_color",100)||null,
  bracelet_material:text(form,"bracelet_material",100)||null,warranty_info:text(form,"warranty_info",250)||null,
  description:text(form,"description",5000)||null,set_contents,set_contents_notes,box_included:set_contents==="full_set"||set_contents==="box_only",papers_included:set_contents==="full_set"||set_contents==="papers_only"
 }).eq("id",id);
 if(saveError){
  console.error("[Sellfast] update listing failed", {code:saveError.code,message:saveError.message});
  const missingSchema=saveError.code==="42703"||saveError.code==="PGRST204"||/column .* does not exist|schema cache/i.test(saveError.message||"");
  redirect("/admin/listings/"+id+"/edit?error="+(missingSchema?"schema":"save"));
 }
 if(files.length){
  const {data:current}=await db.from("listing_images").select("position").eq("listing_id",id).order("position",{ascending:false}).limit(1);
  let position=(current?.[0]?.position??-1)+1;
  const rows=[];
  for(const file of files){
   const path=user.id+"/"+id+"/"+randomUUID()+"-"+fileName(file.name);
   const {error}=await db.storage.from("seller-uploads").upload(path,file,{contentType:file.type,upsert:false});
   if(error)redirect("/admin/listings/"+id+"/edit?error=upload");
   rows.push({listing_id:id,storage_bucket:"seller-uploads",storage_path:path,alt_text:file.name.slice(0,250),position,is_primary:false});position++;
  }
  const {error}=await db.from("listing_images").insert(rows);if(error)redirect("/admin/listings/"+id+"/edit?error=images");
  if(old.status==="published"){const {error:unpublishError}=await db.from("listings").update({status:"draft"}).eq("id",id);if(unpublishError)redirect("/admin/listings/"+id+"/edit?error=save")}
 }
 revalidatePath("/");revalidatePath("/watches");revalidatePath("/admin/listings");revalidatePath("/sitemap.xml");if(old.slug)revalidatePath("/watches/"+old.slug);redirect("/admin/listings?updated=1");
}

type AdminListingImage = {
  id: string; listing_id: string; storage_bucket: "seller-uploads" | "watch-images";
  storage_path: string; alt_text: string | null; position: number; is_primary: boolean;
};

async function requireAdminPhotoContext(form: FormData) {
  const { db, user } = await adminClient();
  const id = text(form, "listing_id", 60);
  if (!id) redirect("/admin/listings");
  const { data: listing } = await db.from("listings")
    .select("id,title,slug,status,availability")
    .eq("id", id)
    .maybeSingle();
  if (!listing) redirect("/admin/listings?error=missing");
  return { db, user, listing };
}

async function getAdminPhoto(db: Awaited<ReturnType<typeof createClient>>, listingId: string, imageId: string) {
  const { data } = await db.from("listing_images")
    .select("id,listing_id,storage_bucket,storage_path,alt_text,position,is_primary")
    .eq("id", imageId)
    .eq("listing_id", listingId)
    .maybeSingle();
  return data as AdminListingImage | null;
}

function validAdminPhoto(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type)
    && file.size > 0
    && file.size <= 10 * 1024 * 1024;
}

function refreshAdminPhotoPages(id: string, slug: string) {
  revalidatePath("/admin/listings");
  revalidatePath("/admin/listings/" + id + "/edit");
  revalidatePath("/watches");
  revalidatePath("/watches/[slug]", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/");
  if (slug) revalidatePath("/watches/" + slug);
}

export async function addAdminListingImages(form: FormData) {
  const { db, user, listing } = await requireAdminPhotoContext(form);
  const id = listing.id;
  const files = form.getAll("photos").filter((v): v is File =>
    typeof v === "object" && v !== null && "size" in v && (v as File).size > 0,
  );
  if (!files.length || files.length > 4 || files.some((file) => !validAdminPhoto(file))) {
    redirect("/admin/listings/" + id + "/edit?error=photo-files");
  }

  const { data: existing } = await db.from("listing_images")
    .select("position,is_primary")
    .eq("listing_id", id)
    .order("position", { ascending: false });
  let position = (existing?.[0]?.position ?? -1) + 1;
  const hasPrimary = (existing || []).some((image: { is_primary: boolean }) => image.is_primary);
  const usePublicBucket = listing.status === "published";
  const bucket = usePublicBucket ? "watch-images" : "seller-uploads";
  const rows: Array<{listing_id:string;storage_bucket:string;storage_path:string;alt_text:string;position:number;is_primary:boolean}> = [];
  const uploadedPaths: string[] = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const path = usePublicBucket
      ? id + "/" + randomUUID() + "-" + fileName(file.name)
      : user.id + "/" + id + "/" + randomUUID() + "-" + fileName(file.name);
    const { error } = await db.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      if (uploadedPaths.length) await db.storage.from(bucket).remove(uploadedPaths);
      redirect("/admin/listings/" + id + "/edit?error=photo-upload");
    }
    uploadedPaths.push(path);
    rows.push({
      listing_id: id,
      storage_bucket: bucket,
      storage_path: path,
      alt_text: (file.name || listing.title).slice(0, 250),
      position: position++,
      is_primary: !hasPrimary && index === 0,
    });
  }
  const { error: insertError } = await db.from("listing_images").insert(rows);
  if (insertError) {
    await db.storage.from(bucket).remove(uploadedPaths);
    redirect("/admin/listings/" + id + "/edit?error=photo-metadata");
  }
  refreshAdminPhotoPages(id, listing.slug);
  redirect("/admin/listings/" + id + "/edit?photos=added");
}

export async function replaceAdminListingImage(form: FormData) {
  const { db, user, listing } = await requireAdminPhotoContext(form);
  const id = listing.id;
  const imageId = text(form, "image_id", 60);
  const file = form.get("photo");
  if (!imageId || !(file instanceof File) || !validAdminPhoto(file)) {
    redirect("/admin/listings/" + id + "/edit?error=photo-files");
  }
  const image = await getAdminPhoto(db, id, imageId);
  if (!image) redirect("/admin/listings/" + id + "/edit?error=photo-missing");

  const bucket = image.storage_bucket;
  const path = bucket === "watch-images"
    ? id + "/" + randomUUID() + "-" + fileName(file.name)
    : user.id + "/" + id + "/" + randomUUID() + "-" + fileName(file.name);
  const { error: uploadError } = await db.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) redirect("/admin/listings/" + id + "/edit?error=photo-upload");

  const { error: updateError } = await db.from("listing_images")
    .update({ storage_path: path, alt_text: file.name.slice(0, 250) })
    .eq("id", image.id)
    .eq("listing_id", id);
  if (updateError) {
    await db.storage.from(bucket).remove([path]);
    redirect("/admin/listings/" + id + "/edit?error=photo-metadata");
  }
  const { error: removeOldError } = await db.storage.from(image.storage_bucket).remove([image.storage_path]);
  if (removeOldError) {
    // The new image is already connected; leaving the old object is a harmless orphan
    // that can be cleaned up later, so keep the listing functional.
  }
  refreshAdminPhotoPages(id, listing.slug);
  redirect("/admin/listings/" + id + "/edit?photos=replaced");
}

export async function deleteAdminListingImage(form: FormData) {
  const { db, listing } = await requireAdminPhotoContext(form);
  const id = listing.id;
  const imageId = text(form, "image_id", 60);
  const image = imageId ? await getAdminPhoto(db, id, imageId) : null;
  if (!image) redirect("/admin/listings/" + id + "/edit?error=photo-missing");

  const { error: metadataError } = await db.from("listing_images").delete()
    .eq("id", image.id)
    .eq("listing_id", id);
  if (metadataError) redirect("/admin/listings/" + id + "/edit?error=photo-metadata");

  const { error: storageError } = await db.storage.from(image.storage_bucket).remove([image.storage_path]);
  if (storageError) {
    // Metadata is gone, so the photo disappears from the listing; object cleanup can be retried.
  }
  if (image.is_primary) {
    const { data: nextPhoto } = await db.from("listing_images")
      .select("id")
      .eq("listing_id", id)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (nextPhoto) {
      await db.from("listing_images").update({ is_primary: true }).eq("id", nextPhoto.id);
    }
  }
  refreshAdminPhotoPages(id, listing.slug);
  redirect("/admin/listings/" + id + "/edit?photos=deleted");
}

export async function setAdminListingCover(form: FormData) {
  const { db, listing } = await requireAdminPhotoContext(form);
  const id = listing.id;
  const imageId = text(form, "image_id", 60);
  const image = imageId ? await getAdminPhoto(db, id, imageId) : null;
  if (!image) redirect("/admin/listings/" + id + "/edit?error=photo-missing");

  const { error: clearError } = await db.from("listing_images")
    .update({ is_primary: false })
    .eq("listing_id", id)
    .eq("is_primary", true);
  if (clearError) redirect("/admin/listings/" + id + "/edit?error=photo-cover");
  const { error } = await db.from("listing_images").update({ is_primary: true }).eq("id", image.id).eq("listing_id", id);
  if (error) redirect("/admin/listings/" + id + "/edit?error=photo-cover");
  refreshAdminPhotoPages(id, listing.slug);
  redirect("/admin/listings/" + id + "/edit?photos=cover");
}

export async function moveAdminListingImage(form: FormData) {
  const { db, listing } = await requireAdminPhotoContext(form);
  const id = listing.id;
  const imageId = text(form, "image_id", 60);
  const direction = text(form, "direction", 5);
  if (!imageId || !["up", "down"].includes(direction)) redirect("/admin/listings/" + id + "/edit?error=photo-order");
  const { data: rows } = await db.from("listing_images").select("id,position").eq("listing_id", id).order("position", { ascending: true });
  const images = rows || [];
  const index = images.findIndex((row: { id: string }) => row.id === imageId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= images.length) redirect("/admin/listings/" + id + "/edit");

  const current = images[index] as { id: string; position: number };
  const other = images[swapIndex] as { id: string; position: number };
  const temporary = Math.max(...images.map((row: { position: number }) => row.position), 0) + images.length + 5;
  const first = await db.from("listing_images").update({ position: temporary }).eq("id", current.id).eq("listing_id", id);
  if (first.error) redirect("/admin/listings/" + id + "/edit?error=photo-order");
  const second = await db.from("listing_images").update({ position: current.position }).eq("id", other.id).eq("listing_id", id);
  if (second.error) redirect("/admin/listings/" + id + "/edit?error=photo-order");
  const third = await db.from("listing_images").update({ position: other.position }).eq("id", current.id).eq("listing_id", id);
  if (third.error) redirect("/admin/listings/" + id + "/edit?error=photo-order");
  refreshAdminPhotoPages(id, listing.slug);
  redirect("/admin/listings/" + id + "/edit?photos=ordered");
}
