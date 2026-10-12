import type { SupabaseClient } from "@supabase/supabase-js";

export type ListingImage = { id:string; listing_id:string; storage_bucket:"seller-uploads"|"watch-images"; storage_path:string; alt_text:string|null; position:number; is_primary:boolean };
export type Listing = {
 id:string; slug:string; title:string; model:string; reference_number:string|null; price_aed:number|null; price_on_request:boolean;
 year:number|null; year_status?:"known"|"unknown"|"not_applicable"; condition:string; movement:string|null; calibre:string|null; case_size_mm:number|null; case_material:string|null;
 dial_color:string|null; bracelet_material:string|null; box_included:boolean; papers_included:boolean; set_contents?:"full_set"|"watch_only"|"box_only"|"papers_only"|"other"|"unknown"; set_contents_notes?:string|null; warranty_info:string|null;
 description:string|null; status:string; availability:string; created_at:string; published_at:string|null; brand_id:string;
 brand?:{name:string;slug:string}|null; listing_images?:ListingImage[];
};
export type Brand = {id:string;name:string;slug:string;sort_order?:number};
export const fallbackWatchImages=[
 "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=85",
 "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=1200&q=85",
 "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1200&q=85",
 "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1200&q=85"
];
export function hasSupabaseConfig(){return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)}
export function formatAED(value:number|string|null|undefined,request=false){if(request||value===null||value===undefined||value==="")return "Price on request";return new Intl.NumberFormat("en-AE",{style:"currency",currency:"AED",maximumFractionDigits:0}).format(Number(value))}
export function conditionLabel(value:string|null|undefined){if(!value)return "Pre-owned";const labels:Record<string,string>={new:"New",unworn:"Unworn",excellent:"Excellent",very_good:"Very good",good:"Good",fair:"Fair"};return labels[value]||value.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
export function listingYearLabel(year:number|null|undefined,status:string|null|undefined){if(status==="not_applicable")return "Not applicable";if(status==="unknown"||year===null||year===undefined)return "Unknown";return String(year)}
export function setContentsLabel(value:string|null|undefined,notes:string|null|undefined){const labels:Record<string,string>={full_set:"Full set (box and papers)",watch_only:"Watch only (naked watch)",box_only:"Box only",papers_only:"Papers only",other:"Other",unknown:"Unknown / not confirmed"};const label=value?labels[value]||"Unknown / not confirmed":"Unknown / not confirmed";return label}
export function publicListingImage(client:SupabaseClient,listing:Listing,seed=""){
 const images=(listing.listing_images||[]).filter(i=>i.storage_bucket==="watch-images").sort((a,b)=>Number(b.is_primary)-Number(a.is_primary)||a.position-b.position);
 if(images.length)return client.storage.from("watch-images").getPublicUrl(images[0].storage_path).data.publicUrl;
 const key=seed||listing.id||listing.slug;const idx=Array.from(key).reduce((n,c)=>n+c.charCodeAt(0),0)%fallbackWatchImages.length;return fallbackWatchImages[idx];
}
export function whatsappHref(message:string){const number=(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER||"").replace(/\D/g,"");const text=encodeURIComponent(message);return number?"https://wa.me/"+number+"?text="+text:"https://wa.me/?text="+text}
export function slugify(value:string){return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
export function titleCase(value:string){return value.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
