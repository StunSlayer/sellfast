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
 const files=form.getAll("photos").filter((v):v is File=>typeof v==="object"&&v!==null&&"size" in v&&(v as File).size>0);
 if(title.length<3||!model||!brand_id||files.length===0||(!price_on_request&&price_aed===null))redirect("/seller/listings/new?error=details");
 for(const file of files)if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>10*1024*1024)redirect("/seller/listings/new?error=images");
 const slug=slugify(title+" "+(text(form,"reference_number",100)||""))+"-"+randomUUID().slice(0,6);
 const {data:listing,error}=await db.from("listings").insert({
  seller_id:auth.user.id,created_by:auth.user.id,brand_id,slug,title,model,reference_number:text(form,"reference_number",120)||null,
  price_aed,price_on_request,year:num(form,"year"),condition:text(form,"condition",30)||"excellent",
  movement:text(form,"movement",100)||null,calibre:text(form,"calibre",100)||null,case_size_mm:num(form,"case_size_mm"),
  case_material:text(form,"case_material",100)||null,dial_color:text(form,"dial_color",100)||null,bracelet_material:text(form,"bracelet_material",100)||null,
  warranty_info:text(form,"warranty_info",250)||null,description:text(form,"description",5000)||null,
  box_included:text(form,"box_included",5)==="true",papers_included:text(form,"papers_included",5)==="true",
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
