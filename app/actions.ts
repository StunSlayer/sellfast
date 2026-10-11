"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
const inquiryTypes=["buy_listing","sell_watch","trade","general"];
export async function submitPublicInquiry(formData:FormData){
 const raw=String(formData.get("return_to")||"/contact");const target=raw.startsWith("/")&&!raw.startsWith("//")?raw:"/contact";const result=(ok:boolean)=>target+(target.includes("?")?"&":"?")+"sent="+(ok?"1":"0");
 if(String(formData.get("company_website")||"").trim())redirect(result(true));
 const full_name=String(formData.get("full_name")||"").trim().slice(0,120),email=String(formData.get("email")||"").trim().slice(0,254),phone=String(formData.get("phone")||"").trim().slice(0,40),message=String(formData.get("message")||"").trim().slice(0,5000);
 const inquiry_type=String(formData.get("inquiry_type")||"general"),listing_id=String(formData.get("listing_id")||"").trim()||null;
 if(full_name.length<2||!message||(!email&&!phone)||!inquiryTypes.includes(inquiry_type))redirect(result(false));
 const db=await createClient();const {data:auth}=await db.auth.getUser();
 const extras=["watch_brand","watch_model","watch_reference","expected_price","condition"].map(k=>{const v=String(formData.get(k)||"").trim().slice(0,180);return v?k.replaceAll("_"," ")+": "+v:""}).filter(Boolean);
 const {error}=await db.from("inquiries").insert({listing_id,inquiry_type,full_name,email:email||null,phone:phone||null,message:[message,...extras].join("\n\n").slice(0,5000),submitted_by:auth.user?.id||null});
 if(error)redirect(result(false));redirect(result(true));
}
