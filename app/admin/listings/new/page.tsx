import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminListing } from "@/app/admin/actions";
import { ListingForm } from "@/components/listing-form";
type Props={searchParams:Promise<{error?:string}>};
const errorMessage=(error?:string)=>error==="images"?"One or more photographs could not be uploaded. The watch may have been saved as a draft.":error==="publish"?"The watch could not be published. Check that image upload worked and retry from inventory.":error==="details"?"Some required fields are missing or invalid. Review the fields highlighted in red.":error==="schema"?"The database is missing the latest listing fields. Apply migration 20261012000500_listing_year_and_set_contents.sql in Supabase, then retry.":error==="save"?"The listing could not be saved to the database. Confirm the latest listing migration is applied, then retry.": "The listing could not be saved. Check the required fields and price.";
export default async function NewAdminListingPage({searchParams}:Props){
 const p=await searchParams,db=await createClient();const {data:brands}=await db.from("brands").select("id,name").eq("is_active",true).order("sort_order");
 return <><div className="admin-heading"><div><div className="eyebrow">Inventory control</div><h1>Add a watch</h1><p>Platform-owned stock is managed alongside moderated third-party listings.</p></div><Link href="/admin/listings" className="text-link"><ArrowLeft size={13}/> Back to inventory</Link></div>
 {p.error?<div className="notice error">{errorMessage(p.error)}</div>:null}
 <ListingForm brands={brands||[]} action={createAdminListing} submitLabel="Save watch" allowPublish serverError={p.error}/>
 </>;
}
