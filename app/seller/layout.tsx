import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/marketplace";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export default async function SellerLayout({children}:{children:React.ReactNode}){
 if(!hasSupabaseConfig())redirect("/auth/login");const db=await createClient();const {data}=await db.auth.getUser();if(!data.user)redirect("/auth/login?next=/seller/dashboard");
 return <><SiteHeader/>{children}<SiteFooter/></>;
}
