import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/marketplace";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const base=(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000").replace(/\/$/,"");
 const routes=["","/watches","/sell-your-watch","/become-a-seller","/about","/contact","/faq","/privacy","/terms"];
 const entries:MetadataRoute.Sitemap=routes.map(route=>({url:base+route,lastModified:new Date(),changeFrequency:route===""?"daily":"weekly",priority:route===""?1:route==="/watches"?.9:.6}));
 if(hasSupabaseConfig()){const db=await createClient();const {data}=await db.from("listings").select("slug,updated_at").eq("status","published").limit(1000);for(const item of data||[])entries.push({url:base+"/watches/"+item.slug,lastModified:new Date(item.updated_at),changeFrequency:"weekly",priority:.7})}
 return entries;
}
