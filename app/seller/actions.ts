"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/marketplace";
function text(form:FormData,key:string,max=5000){return String(form.get(key)||"").trim().slice(0,max)}
function num(form:FormData,key:string){const s=text(form,key,40);if(!s)return null;const n=Number(s);return Number.isFinite(n)?n:null}
function filename(value:string){return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"-").slice(-100)||"watch-image"}
export async function submitSellerListing(form:FormData){
 const db=await createClient(),{data:auth}=await db.auth.getUser();if(!auth.user)redirect("/auth/login");
 const {data:profile}=await db.from("seller_profiles").select("status").eq("user_id",auth.user.id).maybeSingle();
 if(profile?.status!=="approved")redirect("/seller/dashboard?error=not-approved");
 const title=text(form,"title",180),model=text(form,"model",180),brand_id=text(form,"brand_id",60),price_aed=num(form,"price_aed"),price_on_request=text(form,"price_on_request",5)==="true";
 const rawYearStatus=text(form,"year_status",30),year_status=["known","unknown","not_applicable"].includes(rawYearStatus)?rawYearStatus:"unknown";
 const year=year_status==="known"?num(form,"year"):null;
 const rawMovement=text(form,"movement",30).toLowerCase(),movement=rawMovement==="automatic"?"Automatic":rawMovement==="manual"?"Manual winding":rawMovement==="quartz"?"Quartz":rawMovement==="other"?(text(form,"movement_other",100)||"Other"): "Unknown";
 const rawContents=text(form,"set_contents",30),set_contents=["full_set","watch_only","box_only","papers_only","other","unknown"].includes(rawContents)?rawContents:"unknown";
 const set_contents_notes=set_contents==="other"?(text(form,"set_contents_notes",250)||null):null;
 const files=form.getAll("photos").filter((v):v is File=>typeof v==="object"&&v!==null&&"size" in v&&(v as File).size>0);
 if(title.length<3||!model||!brand_id||files.length===0||(!price_on_request&&price_aed===null)||(year_status==="known"&&(year===null||year<1900||year>2100)))redirect("/seller/listings/new?error=details");
 for(const file of files)if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>10*1024*1024)redirect("/seller/listings/new?error=images");
 const slug=slugify(title+" "+(text(form,"reference_number",100)||""))+"-"+randomUUID().slice(0,6);
 const {data:listing,error}=await db.from("listings").insert({
  seller_id:auth.user.id,created_by:auth.user.id,brand_id,slug,title,model,reference_number:text(form,"reference_number",120)||null,
  price_aed,price_on_request,year,year_status,condition:text(form,"condition",30)||"excellent",
  movement,calibre:text(form,"calibre",100)||null,case_size_mm:num(form,"case_size_mm"),
  case_material:text(form,"case_material",100)||null,dial_color:text(form,"dial_color",100)||null,bracelet_material:text(form,"bracelet_material",100)||null,
  warranty_info:text(form,"warranty_info",250)||null,description:text(form,"description",5000)||null,
  set_contents,set_contents_notes,box_included:set_contents==="full_set"||set_contents==="box_only",papers_included:set_contents==="full_set"||set_contents==="papers_only",
  status:"pending_review",availability:"available"
 }).select("id").single();
 if(error||!listing)redirect("/seller/listings/new?error=save");
 const images=[];
 for(let i=0;i<files.length;i++){
  const file=files[i],path=auth.user.id+"/"+listing.id+"/"+randomUUID()+"-"+filename(file.name);
  const {error:uploadError}=await db.storage.from("seller-uploads").upload(path,file,{contentType:file.type,upsert:false});
  if(uploadError)redirect("/seller/listings/new?error=upload");
  images.push({listing_id:listing.id,storage_bucket:"seller-uploads",storage_path:path,alt_text:file.name.slice(0,250),position:i,is_primary:i===0});
 }
 const {error:imageError}=await db.from("listing_images").insert(images);
 if(imageError)redirect("/seller/listings/new?error=images");
 revalidatePath("/seller/dashboard");revalidatePath("/admin/listings");redirect("/seller/dashboard?submitted=1");
}

type SellerListing = { id: string; title: string; seller_id: string; status: string; availability: string };
type SellerListingImage = {
  id: string; listing_id: string; storage_bucket: "seller-uploads" | "watch-images";
  storage_path: string; alt_text: string | null; position: number; is_primary: boolean;
};

async function requireImageManager(form: FormData) {
  const db = await createClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) redirect("/auth/login?next=/seller/dashboard");
  const id = text(form, "listing_id", 60);
  if (!id) redirect("/seller/dashboard?error=listing");
  const { data: profile } = await db.from("seller_profiles").select("status").eq("user_id", auth.user.id).maybeSingle();
  if (profile?.status !== "approved") redirect("/seller/dashboard?error=not-approved");
  const { data: listing } = await db.from("listings")
    .select("id,title,seller_id,status,availability")
    .eq("id", id).eq("seller_id", auth.user.id).maybeSingle();
  if (!listing) redirect("/seller/dashboard?error=listing");
  if (!["draft", "pending_review", "rejected", "published"].includes(listing.status) || listing.availability !== "available") {
    redirect("/seller/listings/" + id + "/images?error=locked");
  }
  return { db, user: auth.user, listing: listing as SellerListing };
}

async function sendPublishedListingBackToReview(db: Awaited<ReturnType<typeof createClient>>, listing: SellerListing, sellerId: string) {
  if (listing.status !== "published") return;
  const { error } = await db.from("listings").update({ status: "pending_review" })
    .eq("id", listing.id).eq("seller_id", sellerId).eq("status", "published");
  if (error) redirect("/seller/listings/" + listing.id + "/images?error=unpublish");
}

function refreshSellerImagePages(listingId: string) {
  revalidatePath("/seller/dashboard");
  revalidatePath("/seller/listings/" + listingId + "/images");
  revalidatePath("/admin/listings");
  revalidatePath("/watches");
  revalidatePath("/watches/[slug]", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/");
}

function validImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size > 0 && file.size <= 10 * 1024 * 1024;
}

async function storeSellerPhoto(db: Awaited<ReturnType<typeof createClient>>, userId: string, listingId: string, file: File) {
  const path = userId + "/" + listingId + "/" + randomUUID() + "-" + filename(file.name);
  const { error } = await db.storage.from("seller-uploads").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: true as const, path: "" };
  return { error: false as const, path };
}

async function getSellerPhoto(db: Awaited<ReturnType<typeof createClient>>, listingId: string, imageId: string) {
  const { data } = await db.from("listing_images")
    .select("id,listing_id,storage_bucket,storage_path,alt_text,position,is_primary")
    .eq("id", imageId).eq("listing_id", listingId).maybeSingle();
  return data as SellerListingImage | null;
}

export async function addSellerListingImages(form: FormData) {
  const { db, user, listing } = await requireImageManager(form);
  const files = form.getAll("photos").filter((v): v is File => typeof v === "object" && v !== null && "size" in v && (v as File).size > 0);
  if (!files.length || files.length > 4 || files.some(file => !validImage(file))) {
    redirect("/seller/listings/" + listing.id + "/images?error=files");
  }

  const uploads: Array<{ path: string; file: File }> = [];
  for (const file of files) {
    const stored = await storeSellerPhoto(db, user.id, listing.id, file);
    if (stored.error) redirect("/seller/listings/" + listing.id + "/images?error=upload");
    uploads.push({ path: stored.path, file });
  }

  await sendPublishedListingBackToReview(db, listing, user.id);
  const { data: current } = await db.from("listing_images").select("position,is_primary").eq("listing_id", listing.id).order("position", { ascending: false });
  let position = (current?.[0]?.position ?? -1) + 1;
  const hasPrimary = (current || []).some((image: { is_primary: boolean }) => image.is_primary);
  const rows = uploads.map(({ path, file }, index) => ({
    listing_id: listing.id,
    storage_bucket: "seller-uploads",
    storage_path: path,
    alt_text: file.name.slice(0, 250),
    position: position++,
    is_primary: !hasPrimary && index === 0,
  }));
  const { error } = await db.from("listing_images").insert(rows);
  if (error) redirect("/seller/listings/" + listing.id + "/images?error=metadata");
  refreshSellerImagePages(listing.id);
  redirect("/seller/listings/" + listing.id + "/images?added=1");
}

export async function replaceSellerListingImage(form: FormData) {
  const { db, user, listing } = await requireImageManager(form);
  const imageId = text(form, "image_id", 60);
  const file = form.get("photo");
  if (!imageId || !(file instanceof File) || !validImage(file)) redirect("/seller/listings/" + listing.id + "/images?error=files");
  const oldImage = await getSellerPhoto(db, listing.id, imageId);
  if (!oldImage) redirect("/seller/listings/" + listing.id + "/images?error=image");
  const stored = await storeSellerPhoto(db, user.id, listing.id, file);
  if (stored.error) redirect("/seller/listings/" + listing.id + "/images?error=upload");

  await sendPublishedListingBackToReview(db, listing, user.id);
  const { data: maxRow } = await db.from("listing_images").select("position").eq("listing_id", listing.id).order("position", { ascending: false }).limit(1).maybeSingle();
  const temporaryPosition = (maxRow?.position ?? -1) + 1;
  const { data: newImage, error: insertError } = await db.from("listing_images").insert({
    listing_id: listing.id,
    storage_bucket: "seller-uploads",
    storage_path: stored.path,
    alt_text: file.name.slice(0, 250),
    position: temporaryPosition,
    is_primary: false,
  }).select("id").single();
  if (insertError || !newImage) redirect("/seller/listings/" + listing.id + "/images?error=metadata");

  const { error: deleteMetadataError } = await db.from("listing_images").delete().eq("id", oldImage.id).eq("listing_id", listing.id);
  if (deleteMetadataError) redirect("/seller/listings/" + listing.id + "/images?error=metadata");
  await db.storage.from(oldImage.storage_bucket).remove([oldImage.storage_path]);

  const { error: finishError } = await db.from("listing_images").update({
    position: oldImage.position,
    is_primary: oldImage.is_primary,
  }).eq("id", newImage.id).eq("listing_id", listing.id);
  if (finishError) redirect("/seller/listings/" + listing.id + "/images?error=metadata");
  refreshSellerImagePages(listing.id);
  redirect("/seller/listings/" + listing.id + "/images?replaced=1");
}

export async function deleteSellerListingImage(form: FormData) {
  const { db, user, listing } = await requireImageManager(form);
  const imageId = text(form, "image_id", 60);
  if (!imageId) redirect("/seller/listings/" + listing.id + "/images?error=image");
  const image = await getSellerPhoto(db, listing.id, imageId);
  if (!image) redirect("/seller/listings/" + listing.id + "/images?error=image");

  await sendPublishedListingBackToReview(db, listing, user.id);
  const { error: removeError } = await db.storage.from(image.storage_bucket).remove([image.storage_path]);
  if (removeError) redirect("/seller/listings/" + listing.id + "/images?error=delete-storage");
  const { error } = await db.from("listing_images").delete().eq("id", image.id).eq("listing_id", listing.id);
  if (error) redirect("/seller/listings/" + listing.id + "/images?error=delete-metadata");
  if (image.is_primary) {
    const { data: nextCover } = await db.from("listing_images").select("id").eq("listing_id", listing.id).order("position", { ascending: true }).limit(1).maybeSingle();
    if (nextCover) await db.from("listing_images").update({ is_primary: true }).eq("id", nextCover.id).eq("listing_id", listing.id);
  }
  refreshSellerImagePages(listing.id);
  redirect("/seller/listings/" + listing.id + "/images?deleted=1");
}

export async function setSellerListingCover(form: FormData) {
  const { db, user, listing } = await requireImageManager(form);
  const imageId = text(form, "image_id", 60);
  const image = imageId ? await getSellerPhoto(db, listing.id, imageId) : null;
  if (!image) redirect("/seller/listings/" + listing.id + "/images?error=image");
  await sendPublishedListingBackToReview(db, listing, user.id);

  const { error: clearError } = await db.from("listing_images").update({ is_primary: false }).eq("listing_id", listing.id).eq("is_primary", true);
  if (clearError) redirect("/seller/listings/" + listing.id + "/images?error=cover");
  const { error } = await db.from("listing_images").update({ is_primary: true }).eq("id", image.id).eq("listing_id", listing.id);
  if (error) redirect("/seller/listings/" + listing.id + "/images?error=cover");
  refreshSellerImagePages(listing.id);
  redirect("/seller/listings/" + listing.id + "/images?cover=1");
}

export async function moveSellerListingImage(form: FormData) {
  const { db, user, listing } = await requireImageManager(form);
  const imageId = text(form, "image_id", 60);
  const direction = text(form, "direction", 5);
  if (!imageId || !["up", "down"].includes(direction)) redirect("/seller/listings/" + listing.id + "/images?error=image");
  const { data: rows } = await db.from("listing_images").select("id,position").eq("listing_id", listing.id).order("position", { ascending: true });
  const images = rows || [];
  const index = images.findIndex((image: { id: string }) => image.id === imageId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= images.length) redirect("/seller/listings/" + listing.id + "/images");
  await sendPublishedListingBackToReview(db, listing, user.id);

  const current = images[index] as { id: string; position: number };
  const other = images[swapIndex] as { id: string; position: number };
  const temporary = Math.max(...images.map((image: { position: number }) => image.position), 0) + images.length + 5;
  const first = await db.from("listing_images").update({ position: temporary }).eq("id", current.id).eq("listing_id", listing.id);
  if (first.error) redirect("/seller/listings/" + listing.id + "/images?error=order");
  const second = await db.from("listing_images").update({ position: current.position }).eq("id", other.id).eq("listing_id", listing.id);
  if (second.error) redirect("/seller/listings/" + listing.id + "/images?error=order");
  const third = await db.from("listing_images").update({ position: other.position }).eq("id", current.id).eq("listing_id", listing.id);
  if (third.error) redirect("/seller/listings/" + listing.id + "/images?error=order");
  refreshSellerImagePages(listing.id);
  redirect("/seller/listings/" + listing.id + "/images?ordered=1");
}
