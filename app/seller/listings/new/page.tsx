import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/marketplace";
import { ListingForm } from "@/components/listing-form";
import { submitSellerListing } from "@/app/seller/actions";
type Props={searchParams:Promise<{error?:string}>};
export default async function NewSellerListingPage({searchParams}:Props){
 const p=await searchParams;if(!hasSupabaseConfig())redirect("/auth/login");const db=await createClient(),{data:auth}=await db.auth.getUser();if(!auth.user)redirect("/auth/login");
 const {data:profile}=await db.from("seller_profiles").select("status").eq("user_id",auth.user.id).maybeSingle();if(profile?.status!=="approved")redirect("/seller/dashboard?error=not-approved");
 const {data:brands}=await db.from("brands").select("id,name").eq("is_active",true).order("sort_order");
 return <main className="container section"><div className="admin-heading"><div><div className="eyebrow">Seller workspace</div><h1 className="display">Submit a watch</h1><p>Your submission stays pending until the Sellfast team reviews it.</p></div><Link href="/seller/dashboard" className="text-link"><ArrowLeft size={13}/> Back to dashboard</Link></div>{p.error?<div className="notice error">Submission failed. Check the required details, price and image types, then try again.</div>:null}<ListingForm brands={brands||[]} action={submitSellerListing} submitLabel="Submit for review" allowPublish={false}/></main>;
}
