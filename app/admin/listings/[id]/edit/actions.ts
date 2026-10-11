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
 if(title.length<3||!model||!brand_id||(!price_on_request&&price_aed===null))redirect("/admin/listings/"+id+"/edit?error=details");
 const files=form.getAll("photos").filter((v):v is File=>typeof v==="object"&&v!==null&&"size" in v&&(v as File).size>0);
 for(const f of files)if(!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>10*1024*1024)redirect("/admin/listings/"+id+"/edit?error=images");
 const {error:saveError}=await db.from("listings").update({
  brand_id,title,model,reference_number:text(form,"reference_number",120)||null,price_aed,price_on_request,year:number(form,"year"),
  condition:text(form,"condition",30)||"excellent",movement:text(form,"movement",100)||null,calibre:text(form,"calibre",100)||null,
  case_size_mm:number(form,"case_size_mm"),case_material:text(form,"case_material",100)||null,dial_color:text(form,"dial_color",100)||null,
  bracelet_material:text(form,"bracelet_material",100)||null,warranty_info:text(form,"warranty_info",250)||null,
  description:text(form,"description",5000)||null,box_included:text(form,"box_included",5)==="true",papers_included:text(form,"papers_included",5)==="true"
 }).eq("id",id);
 if(saveError)redirect("/admin/listings/"+id+"/edit?error=save");
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
 revalidatePath("/");revalidatePath("/watches");revalidatePath("/admin/listings");redirect("/admin/listings?updated=1");
}
