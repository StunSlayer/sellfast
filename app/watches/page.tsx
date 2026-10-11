import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Brand, Listing, hasSupabaseConfig, publicListingImage } from "@/lib/marketplace";
import { WatchCard } from "@/components/watch-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const metadata:Metadata={title:"Shop Luxury Watches",description:"Browse luxury watches, filter by brand, budget and condition, then enquire with the Sellfast concierge."};
type Props={searchParams:Promise<{q?:string;brand?:string;min?:string;max?:string;condition?:string;sort?:string}>};
export default async function WatchesPage({searchParams}:Props){
 const p=await searchParams,q=(p.q||"").trim().slice(0,80),brandSlug=p.brand||"",condition=p.condition||"",sort=p.sort||"newest";
 const min=Number(p.min||""),max=Number(p.max||"");
 let brands:Brand[]=[], listings:Listing[]=[], imageUrls=new Map<string,string>();
 if(hasSupabaseConfig()){
  const db=await createClient();
  const {data:brandRows}=await db.from("brands").select("id,name,slug,sort_order").eq("is_active",true).order("sort_order");
  brands=(brandRows||[]) as Brand[];
  let query=db.from("listings").select("*, brand:brands(name,slug), listing_images(*)").eq("status","published").eq("availability","available");
  if(brandSlug){const b=brands.find(x=>x.slug===brandSlug);query=b?query.eq("brand_id",b.id):query.eq("brand_id","00000000-0000-0000-0000-000000000000")}
  if(q){const safe=q.replace(/[%_,()]/g," ").replace(/\s+/g," ").trim();if(safe)query=query.or("title.ilike.%"+safe+"%,model.ilike.%"+safe+"%,reference_number.ilike.%"+safe+"%")}
  if(condition)query=query.eq("condition",condition);
  if(p.min&&Number.isFinite(min)&&min>=0)query=query.gte("price_aed",min);
  if(p.max&&Number.isFinite(max)&&max>=0)query=query.lte("price_aed",max);
  if(sort==="price-low")query=query.order("price_aed",{ascending:true,nullsFirst:false});
  else if(sort==="price-high")query=query.order("price_aed",{ascending:false,nullsFirst:false});
  else query=query.order("published_at",{ascending:false,nullsFirst:false});
  const {data}=await query.limit(48);listings=(data||[]) as unknown as Listing[];
  imageUrls=new Map(listings.map(row=>[row.id,publicListingImage(db,row)]));
 }
 const hasFilters=Boolean(q||brandSlug||p.min||p.max||condition);
 return <><SiteHeader/><main>
  <section className="page-hero"><div className="container"><div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>Watches</span></div><div className="eyebrow">The collection</div><h1 className="display">Find your next icon.</h1><p>Browse our live catalogue of available timepieces. Each listing includes the details on file; our concierge can help with questions before you commit.</p></div></section>
  <section className="section-tight"><div className="container catalog-layout">
   <aside className="filter-panel"><h2 className="filter-title">Refine selection</h2><form method="get" action="/watches">
    <div className="form-field"><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={q} placeholder="Model or reference"/></div>
    <div className="form-field"><label htmlFor="brand">Brand</label><select id="brand" name="brand" defaultValue={brandSlug}><option value="">All brands</option>{brands.map(b=><option key={b.id} value={b.slug}>{b.name}</option>)}</select></div>
    <div className="form-field"><label>Price range (AED)</label><div className="filter-prices"><input aria-label="Minimum price" name="min" type="number" min="0" placeholder="Min" defaultValue={p.min||""}/><input aria-label="Maximum price" name="max" type="number" min="0" placeholder="Max" defaultValue={p.max||""}/></div></div>
    <div className="form-field"><label htmlFor="condition">Condition</label><select id="condition" name="condition" defaultValue={condition}><option value="">Any condition</option><option value="new">New</option><option value="unworn">Unworn</option><option value="excellent">Excellent</option><option value="very_good">Very good</option><option value="good">Good</option><option value="fair">Fair</option></select></div>
    <input type="hidden" name="sort" value={sort}/><button className="button" type="submit"><SlidersHorizontal size={14}/> Apply filters</button>
   </form>{hasFilters?<Link href="/watches" className="text-link" style={{marginTop:16}}>Clear filters</Link>:null}</aside>
   <div><div className="catalog-top"><p><strong>{listings.length}</strong> {listings.length===1?"timepiece":"timepieces"} shown{listings.length===48?" · Showing first 48":""}</p><form method="get" action="/watches" className="inline-actions">{q?<input type="hidden" name="q" value={q}/>:null}{brandSlug?<input type="hidden" name="brand" value={brandSlug}/>:null}{p.min?<input type="hidden" name="min" value={p.min}/>:null}{p.max?<input type="hidden" name="max" value={p.max}/>:null}{condition?<input type="hidden" name="condition" value={condition}/>:null}<label htmlFor="sort" className="field-label">Sort</label><select name="sort" id="sort" defaultValue={sort}><option value="newest">Newest first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select><button className="mini-button" type="submit">Apply</button></form></div>
   <div className="catalog-results">{listings.length?listings.map(row=><WatchCard key={row.id} listing={row} imageUrl={imageUrls.get(row.id)||""}/>):<div className="empty-state"><h3>No watches match this selection yet.</h3><p>Try broadening your filters or tell us which reference you are looking for. Our team can check availability with its network.</p><div className="hero-actions" style={{justifyContent:"center",marginTop:18}}><Link href="/contact" className="button">Request a watch <ArrowRight size={14}/></Link><Link href="/watches" className="button button-outline">Reset search</Link></div></div>}</div></div>
  </div></section>
 </main><SiteFooter/></>;
}
