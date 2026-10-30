"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/marketplace";

async function requireAdmin(){
 const db=await createClient();const {data}=await db.auth.getUser();
 if(!data.user)redirect("/auth/login?next=/admin");
 const {data:isAdmin,error}=await db.rpc("is_admin");
 if(error||isAdmin!==true)redirect("/");
 return {db,user:data.user};
}
function safeText(form:FormData,key:string,max=5000){return String(form.get(key)||"").trim().slice(0,max)}
function numeric(form:FormData,key:string){const value=safeText(form,key,40);if(!value)return null;const n=Number(value);return Number.isFinite(n)?n:null}
function safeFilename(value:string){return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"-").slice(-100)||"watch-image"}
async function savePrivateImages(db:Awaited<ReturnType<typeof createClient>>,userId:string,listingId:string,files:File[]){
 const rows:{listing_id:string;storage_bucket:string;storage_path:string;alt_text:string;position:number;is_primary:boolean}[]=[];
 for(let index=0;index<files.length;index++){
  const file=files[index];if(!file.size)continue;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>10*1024*1024)throw new Error("Images must be JPEG, PNG or WebP and under 10 MB each.");
  const path=userId+"/"+listingId+"/"+randomUUID()+"-"+safeFilename(file.name);
  const {error}=await db.storage.from("seller-uploads").upload(path,file,{contentType:file.type,upsert:false});
  if(error)throw new Error("Image upload failed: "+error.message);
  rows.push({listing_id:listingId,storage_bucket:"seller-uploads",storage_path:path,alt_text:file.name.slice(0,250),position:index,is_primary:index===0});
 }
 if(rows.length){const {error}=await db.from("listing_images").insert(rows);if(error)throw new Error("Image details could not be saved: "+error.message)}
 return rows.length;
}
async function publishImages(db:Awaited<ReturnType<typeof createClient>>,listingId:string){
 const {data:images,error}=await db.from("listing_images").select("*").eq("listing_id",listingId).order("position");
 if(error)throw new Error("Could not read listing images.");
 if(!images?.length)throw new Error("Add at least one photograph before publishing.");
 for(const image of images){
  if(image.storage_bucket==="watch-images")continue;
  const {data:file,error:downloadError}=await db.storage.from("seller-uploads").download(image.storage_path);
  if(downloadError||!file)throw new Error("A private image could not be read for publication.");
  const path=listingId+"/"+randomUUID()+"-"+safeFilename(image.storage_path.split("/").pop()||"watch-image");
  const {error:uploadError}=await db.storage.from("watch-images").upload(path,file,{contentType:file.type||"image/jpeg",upsert:false});
  if(uploadError)throw new Error("A public image could not be created: "+uploadError.message);
  const {error:updateError}=await db.from("listing_images").update({storage_bucket:"watch-images",storage_path:path}).eq("id",image.id);
  if(updateError){await db.storage.from("watch-images").remove([path]);throw new Error("Image metadata could not be updated.");}
  await db.storage.from("seller-uploads").remove([image.storage_path]);
 }
}
export async function createAdminListing(form:FormData){
 const {db,user}=await requireAdmin();const title=safeText(form,"title",180),model=safeText(form,"model",180),brand_id=safeText(form,"brand_id",50);
 const price_aed=numeric(form,"price_aed"),price_on_request=safeText(form,"price_on_request",5)==="true";
 const rawYearStatus=safeText(form,"year_status",30),year_status=["known","unknown","not_applicable"].includes(rawYearStatus)?rawYearStatus:"unknown";
 const year=year_status==="known"?numeric(form,"year"):null;
 const rawMovement=safeText(form,"movement",30).toLowerCase(),movement=rawMovement==="automatic"?"Automatic":rawMovement==="manual"?"Manual winding":rawMovement==="quartz"?"Quartz":rawMovement==="other"?(safeText(form,"movement_other",100)||"Other"):"Unknown";
 const rawContents=safeText(form,"set_contents",30),set_contents=["full_set","watch_only","box_only","papers_only","other","unknown"].includes(rawContents)?rawContents:"unknown";
 const set_contents_notes=set_contents==="other"?(safeText(form,"set_contents_notes",250)||null):null;
 const files=form.getAll("photos").filter((v):v is File=>typeof v==="object"&&v!==null&&"size" in v&&(v as File).size>0);
 if(title.length<3||!model||!brand_id||(!price_on_request&&price_aed===null)||(year_status==="known"&&(year===null||year<1900||year>2100)))redirect("/admin/listings/new?error=details");
 const slug=slugify(title+" "+(safeText(form,"reference_number",100)||""))+"-"+randomUUID().slice(0,6);
 const record={
  seller_id:null,created_by:user.id,brand_id,slug,title,model,reference_number:safeText(form,"reference_number",120)||null,
  price_aed,price_on_request,year,year_status,condition:safeText(form,"condition",30)||"excellent",
  movement,calibre:safeText(form,"calibre",100)||null,case_size_mm:numeric(form,"case_size_mm"),
  case_material:safeText(form,"case_material",100)||null,dial_color:safeText(form,"dial_color",100)||null,bracelet_material:safeText(form,"bracelet_material",100)||null,
  warranty_info:safeText(form,"warranty_info",250)||null,description:safeText(form,"description",5000)||null,
  set_contents,set_contents_notes,
  box_included:set_contents==="full_set"||set_contents==="box_only",papers_included:set_contents==="full_set"||set_contents==="papers_only",
  status:"draft",availability:"available"
 };
 const {data:listing,error}=await db.from("listings").insert(record).select("id").single();
 if(error||!listing){
  console.error("[Sellfast] create listing insert failed", {code:error?.code,message:error?.message});
  const missingSchema=error?.code==="42703"||error?.code==="PGRST204"||/column .* does not exist|schema cache/i.test(error?.message||"");
  redirect(missingSchema?"/admin/listings/new?error=schema":"/admin/listings/new?error=save");
 }
 try{await savePrivateImages(db,user.id,listing.id,files)}catch{redirect("/admin/listings/new?error=images")}
 if(safeText(form,"publish_now",5)==="true"){
  try{await publishImages(db,listing.id)}catch{redirect("/admin/listings/"+listing.id+"/edit?error=publish")}
  const {error:publishError}=await db.from("listings").update({status:"published",published_at:new Date().toISOString()}).eq("id",listing.id);
  if(publishError)redirect("/admin/listings/"+listing.id+"/edit?error=publish");
 }
 revalidatePath("/");revalidatePath("/watches");revalidatePath("/admin/listings");revalidatePath("/sitemap.xml");redirect("/admin/listings?created=1");
}
export async function setListingStatus(form:FormData){
 const {db}=await requireAdmin();const id=safeText(form,"listing_id",60),status=safeText(form,"status",30);
 if(!id||!["draft","pending_review","published","rejected","archived"].includes(status))redirect("/admin/listings?error=status");
 if(status==="published"){
  const {data:listing}=await db.from("listings").select("seller_id").eq("id",id).maybeSingle();
  if(!listing)redirect("/admin/listings?error=missing");
  if(listing.seller_id){
   const {data:seller}=await db.from("seller_profiles").select("status").eq("user_id",listing.seller_id).maybeSingle();
   if(seller?.status!=="approved")redirect("/admin/listings?error=seller-not-approved");
  }
  try{await publishImages(db,id)}catch{redirect("/admin/listings?error=publish")}
 }
 const update:Record<string,unknown>={status};
 if(status==="published")update.published_at=new Date().toISOString();
 const {error}=await db.from("listings").update(update).eq("id",id);if(error)redirect("/admin/listings?error=update");
 revalidatePath("/");revalidatePath("/watches");revalidatePath("/watches/[slug]","page");revalidatePath("/admin/listings");revalidatePath("/sitemap.xml");redirect("/admin/listings?updated=1");
}
export async function setListingAvailability(form:FormData){
 const {db}=await requireAdmin();const id=safeText(form,"listing_id",60),availability=safeText(form,"availability",30);
 if(!id||!["available","reserved","sold"].includes(availability))redirect("/admin/listings?error=status");
 const {error}=await db.from("listings").update({availability}).eq("id",id);if(error)redirect("/admin/listings?error=update");
 revalidatePath("/");revalidatePath("/watches");revalidatePath("/admin/listings");redirect("/admin/listings?updated=1");
}
export async function setSellerStatus(form:FormData){
 const {db}=await requireAdmin();const user_id=safeText(form,"user_id",60),status=safeText(form,"status",30);
 if(!user_id||!["approved","rejected","suspended","pending"].includes(status))redirect("/admin/sellers?error=details");
 const {error}=await db.from("seller_profiles").update({status}).eq("user_id",user_id);
 if(error)redirect("/admin/sellers?error=update");
 if(status!=="approved"){
  const {error:archiveError}=await db.from("listings").update({status:"archived"}).eq("seller_id",user_id).eq("status","published");
  if(archiveError)redirect("/admin/sellers?error=archive");
 }
 revalidatePath("/admin/sellers");revalidatePath("/seller/dashboard");revalidatePath("/admin/listings");revalidatePath("/watches");revalidatePath("/");
 redirect("/admin/sellers?updated=1");
}
export async function setInquiryStatus(form:FormData){
 const {db,user}=await requireAdmin();const id=safeText(form,"inquiry_id",60),status=safeText(form,"status",30);
 if(!id||!["new","contacted","qualified","closed","spam"].includes(status))redirect("/admin/inquiries?error=details");
 const {error}=await db.from("inquiries").update({status,assigned_to:user.id}).eq("id",id);
 if(error)redirect("/admin/inquiries?error=update");revalidatePath("/admin/inquiries");redirect("/admin/inquiries?updated=1");
}
export async function createBrand(form:FormData){
 const {db}=await requireAdmin();const name=safeText(form,"name",120),slug=slugify(name),description=safeText(form,"description",1000);
 if(name.length<2||!slug)redirect("/admin/brands?error=details");
 const {error}=await db.from("brands").insert({name,slug,description:description||null,is_active:true});
 if(error)redirect("/admin/brands?error=exists");revalidatePath("/");revalidatePath("/watches");redirect("/admin/brands?created=1");
}
export async function toggleBrand(form:FormData){
 const {db}=await requireAdmin();const id=safeText(form,"brand_id",60),active=safeText(form,"is_active",5)==="true";
 const {error}=await db.from("brands").update({is_active:!active}).eq("id",id);
 if(error)redirect("/admin/brands?error=update");revalidatePath("/");revalidatePath("/watches");redirect("/admin/brands?updated=1");
}

export async function deleteBrand(form:FormData){
 const {db}=await requireAdmin();
 const id=safeText(form,"brand_id",60);
 if(!id)redirect("/admin/brands?error=update");
 const {count,error:countError}=await db.from("listings").select("id",{count:"exact",head:true}).eq("brand_id",id);
 if(countError)redirect("/admin/brands?error=update");
 if((count||0)>0)redirect("/admin/brands?error=in-use");
 const {error}=await db.from("brands").delete().eq("id",id);
 if(error)redirect("/admin/brands?error=update");
 revalidatePath("/");
 revalidatePath("/watches");
 revalidatePath("/admin/brands");
 redirect("/admin/brands?removed=1");
}

const homepageSlots = ["hero","sell_feature"] as const;
type HomepageSlot = typeof homepageSlots[number];

function safeImageFile(file: File) {
 return file.size > 0
  && file.size <= 10 * 1024 * 1024
  && ["image/jpeg","image/png","image/webp"].includes(file.type);
}

export async function saveHomepageImage(form:FormData){
 const {db,user}=await requireAdmin();
 const slot=safeText(form,"slot",30) as HomepageSlot;
 if(!homepageSlots.includes(slot))redirect("/admin/homepage?error=slot");
 const file=form.get("image");
 const alt=safeText(form,"alt_text",250);
 if(!(file instanceof File)||!safeImageFile(file))redirect("/admin/homepage?error=file");
 const {data:old}=await db.from("homepage_media").select("storage_path").eq("slot",slot).maybeSingle();
 const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
 const path=slot+"/"+randomUUID()+"."+ext;
 const {error:uploadError}=await db.storage.from("site-media").upload(path,file,{contentType:file.type,upsert:false});
 if(uploadError)redirect("/admin/homepage?error=upload");
 const {error:saveError}=await db.from("homepage_media").upsert({
  slot,
  storage_path:path,
  alt_text:alt||(slot==="hero"?"Sellfast luxury watch collection":"Sellfast watch selling and trading"),
  updated_by:user.id,
 },{onConflict:"slot"});
 if(saveError){
  await db.storage.from("site-media").remove([path]);
  console.error("[Sellfast] homepage media save failed",{code:saveError.code,message:saveError.message});
  redirect("/admin/homepage?error=save");
 }
 if(old?.storage_path)await db.storage.from("site-media").remove([old.storage_path]);
 revalidatePath("/");
 revalidatePath("/admin/homepage");
 redirect("/admin/homepage?saved="+slot);
}

export async function removeHomepageImage(form:FormData){
 const {db}=await requireAdmin();
 const slot=safeText(form,"slot",30) as HomepageSlot;
 if(!homepageSlots.includes(slot))redirect("/admin/homepage?error=slot");
 const {data:old,error:readError}=await db.from("homepage_media").select("storage_path").eq("slot",slot).maybeSingle();
 if(readError)redirect("/admin/homepage?error=save");
 const {error}=await db.from("homepage_media").delete().eq("slot",slot);
 if(error)redirect("/admin/homepage?error=save");
 if(old?.storage_path)await db.storage.from("site-media").remove([old.storage_path]);
 revalidatePath("/");
 revalidatePath("/admin/homepage");
 redirect("/admin/homepage?removed="+slot);
}

type ListingImageStorageRef = { storage_bucket: "seller-uploads" | "watch-images"; storage_path: string };

async function collectStorageFolderFiles(
 db: Awaited<ReturnType<typeof createClient>>,
 bucket: "seller-uploads" | "watch-images",
 prefix: string,
): Promise<string[]> {
 if (!prefix) return [];
 const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000 });
 if (error) {
  console.error("[Sellfast] could not list listing image folder", { bucket, prefix, message: error.message });
  throw new Error("Could not verify every linked image file before deletion.");
 }
 return (data || [])
  .filter((entry) => entry.id !== null)
  .map((entry) => prefix + "/" + entry.name);
}

export async function deleteAdminListing(form: FormData) {
 const { db } = await requireAdmin();
 const id = safeText(form, "listing_id", 60);
 if (!id) redirect("/admin/listings?error=delete-missing");

 const { data: listing, error: listingReadError } = await db
  .from("listings")
  .select("id,title,slug,seller_id,created_by")
  .eq("id", id)
  .maybeSingle();

 if (listingReadError || !listing) {
  console.error("[Sellfast] listing delete lookup failed", { id, message: listingReadError?.message });
  redirect("/admin/listings?error=delete-missing");
 }

 const { data: imageRows, error: imageReadError } = await db
  .from("listing_images")
  .select("storage_bucket,storage_path")
  .eq("listing_id", id);

 if (imageReadError) {
  console.error("[Sellfast] listing image lookup failed", { id, message: imageReadError.message });
  redirect("/admin/listings?error=delete-images");
 }

 const filesByBucket: Record<"seller-uploads" | "watch-images", Set<string>> = {
  "seller-uploads": new Set<string>(),
  "watch-images": new Set<string>(),
 };

 for (const image of (imageRows || []) as ListingImageStorageRef[]) {
  if (image.storage_bucket !== "seller-uploads" && image.storage_bucket !== "watch-images") {
   console.error("[Sellfast] unexpected storage bucket on listing image", { id, bucket: image.storage_bucket });
   redirect("/admin/listings?error=delete-images");
  }
  filesByBucket[image.storage_bucket].add(image.storage_path);
 }

 // Also inspect the listing-specific folders so uploads left behind by a failed
 // image-metadata insert are cleaned up along with the linked image records.
 try {
  const publicFiles = await collectStorageFolderFiles(db, "watch-images", id);
  publicFiles.forEach((path) => filesByBucket["watch-images"].add(path));

  const privatePrefixes = new Set<string>();
  if (listing.created_by) privatePrefixes.add(listing.created_by + "/" + id);
  if (listing.seller_id) privatePrefixes.add(listing.seller_id + "/" + id);
  for (const prefix of privatePrefixes) {
   const privateFiles = await collectStorageFolderFiles(db, "seller-uploads", prefix);
   privateFiles.forEach((path) => filesByBucket["seller-uploads"].add(path));
  }
 } catch {
  redirect("/admin/listings?error=delete-storage");
 }

 // Remove actual objects before deleting the database row. If cleanup fails, keep
 // the listing record so the remaining files can be reviewed and retried.
 for (const bucket of ["seller-uploads", "watch-images"] as const) {
  const paths = Array.from(filesByBucket[bucket]);
  for (let offset = 0; offset < paths.length; offset += 100) {
   const batch = paths.slice(offset, offset + 100);
   if (!batch.length) continue;
   const { error } = await db.storage.from(bucket).remove(batch);
   if (error) {
    console.error("[Sellfast] listing image storage deletion failed", { id, bucket, message: error.message });
    redirect("/admin/listings?error=delete-storage");
   }
  }
 }

 // listing_images cascade on listing deletion; inquiries deliberately survive with
 // listing_id set to NULL, preserving the admin's customer lead history.
 const { error: deleteError } = await db.from("listings").delete().eq("id", id);
 if (deleteError) {
  console.error("[Sellfast] listing database deletion failed", { id, message: deleteError.message });
  redirect("/admin/listings?error=delete-db");
 }

 revalidatePath("/admin/listings");
 revalidatePath("/admin");
 revalidatePath("/admin/inquiries");
 revalidatePath("/seller/dashboard");
 revalidatePath("/");
 revalidatePath("/watches");
 revalidatePath("/sitemap.xml");
 if (listing.slug) revalidatePath("/watches/" + listing.slug);
 redirect("/admin/listings?deleted=1");
}
