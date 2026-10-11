"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export async function applyAsSeller(formData:FormData){
 const db=await createClient();const {data:auth}=await db.auth.getUser();if(!auth.user)redirect("/auth/login");
 const display_name=String(formData.get("display_name")||"").trim().slice(0,120),company_name=String(formData.get("company_name")||"").trim().slice(0,180),contact_phone=String(formData.get("contact_phone")||"").trim().slice(0,40);
 if(display_name.length<2||contact_phone.length<6)redirect("/become-a-seller?error=details");
 const {error}=await db.from("seller_profiles").upsert({user_id:auth.user.id,display_name,company_name:company_name||null,contact_phone,status:"pending"},{onConflict:"user_id"});
 if(error)redirect("/become-a-seller?error=application");revalidatePath("/become-a-seller");redirect("/seller/dashboard?applied=1");
}
