import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CheckCircle2, MessageCircle, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Listing, conditionLabel, formatAED, hasSupabaseConfig, whatsappHref } from "@/lib/marketplace";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { submitPublicInquiry } from "@/app/actions";
type Props={params:Promise<{slug:string}>;searchParams:Promise<{sent?:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug}=await params;if(!hasSupabaseConfig())return {title:"Luxury Watch"};
 const db=await createClient();const {data}=await db.from("listings").select("title,description").eq("slug",slug).eq("status","published").maybeSingle();
 return {title:data?.title||"Luxury Watch",description:data?.description||"View watch details and enquire with the Sellfast concierge.",openGraph:{title:data?.title||"Luxury Watch",description:data?.description||"A curated timepiece at Sellfast."}};
}
export default async function WatchDetailPage({params,searchParams}:Props){
 const {slug}=await params,p=await searchParams;if(!hasSupabaseConfig())notFound();
 const db=await createClient();const {data}=await db.from("listings").select("*, brand:brands(name,slug), listing_images(*)").eq("slug",slug).eq("status","published").maybeSingle();
 if(!data)notFound();const row=data as unknown as Listing;
 const images=(row.listing_images||[]).filter(i=>i.storage_bucket==="watch-images").sort((a,b)=>Number(b.is_primary)-Number(a.is_primary)||a.position-b.position);
 const urls=images.map(i=>db.storage.from("watch-images").getPublicUrl(i.storage_path).data.publicUrl);
 const sold=row.availability==="sold",reserved=row.availability==="reserved";
 const message="Hello Sellfast, I am interested in "+row.title+(row.reference_number?" (Ref. "+row.reference_number+")":"")+". Please share availability and next steps.";
 return <><SiteHeader/><main><section className="page-hero"><div className="container"><div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><Link href="/watches">Watches</Link><span>/</span><span>{row.title}</span></div><Link className="text-link" href="/watches"><ArrowLeft size={13}/> Back to collection</Link></div></section>
 <section className="container product-layout"><div className="product-gallery">{urls.length?urls.map((url,i)=><img key={url+i} className="product-gallery-item" src={url} alt={row.title+" view "+(i+1)} loading={i?"lazy":"eager"}/>):<div className="product-gallery-placeholder"><span>SELLFAST · TIMEPIECES</span><strong>{row.brand?.name||"Fine timepiece"}</strong><small>Additional photography available on request</small></div>}</div>
 <div className="product-detail"><div className="eyebrow">{row.brand?.name||"Fine timepiece"}</div><h1 className="display">{row.title}</h1><div className="product-sub">{row.reference_number?"Reference "+row.reference_number+" · ":""}{row.year||"Year not specified"} · {conditionLabel(row.condition)}</div>
 <div className="product-main-price">{formatAED(row.price_aed,row.price_on_request)}</div><span className={"product-status"+(sold?" sold":"")}>{sold?"Sold":reserved?"Reserved · Enquire for updates":"Available to enquire"}</span>
 <p className="product-description">{row.description||"Contact our concierge for further details, additional photographs and to arrange a viewing. Specifications are based on the information provided with this listing."}</p>
 <div className="spec-grid"><div className="spec-item"><span>Condition</span><strong>{conditionLabel(row.condition)}</strong></div><div className="spec-item"><span>Year</span><strong>{row.year||"Not specified"}</strong></div><div className="spec-item"><span>Movement</span><strong>{row.movement||"Ask concierge"}</strong></div><div className="spec-item"><span>Case size</span><strong>{row.case_size_mm?row.case_size_mm+" mm":"Ask concierge"}</strong></div><div className="spec-item"><span>Box</span><strong>{row.box_included?"Included":"Not specified"}</strong></div><div className="spec-item"><span>Original papers</span><strong>{row.papers_included?"Included":"Not specified"}</strong></div><div className="spec-item"><span>Case material</span><strong>{row.case_material||"Ask concierge"}</strong></div><div className="spec-item"><span>Dial</span><strong>{row.dial_color||"Ask concierge"}</strong></div></div>
 <div className="product-actions"><a className="button" href={whatsappHref(message)} target="_blank" rel="noreferrer"><MessageCircle size={15}/> Enquire on WhatsApp</a><a className="button button-outline" href="#send-enquiry">Send an enquiry <ArrowUpRight size={14}/></a></div>
 <p className="product-description"><ShieldCheck size={14} style={{verticalAlign:"middle",marginRight:6}}/>Availability and details should be confirmed by the concierge before any transaction.</p>
 <div id="send-enquiry" className="form-card" style={{marginTop:26}}><h2>Ask about this watch</h2><p>Share your details and our team will follow up.</p>{p.sent==="1"?<div className="notice"><CheckCircle2 size={17}/> Your enquiry has been received.</div>:null}{p.sent==="0"?<div className="notice error">We could not submit the enquiry. Please contact the concierge on WhatsApp.</div>:null}
 <form action={submitPublicInquiry}><input type="hidden" name="listing_id" value={row.id}/><input type="hidden" name="inquiry_type" value="buy_listing"/><input type="hidden" name="return_to" value={"/watches/"+row.slug+"#send-enquiry"}/><input className="honeypot" tabIndex={-1} autoComplete="off" name="company_website" aria-hidden="true"/>
 <div className="form-field"><label htmlFor="full_name">Full name</label><input id="full_name" name="full_name" required minLength={2} maxLength={120}/></div><div className="form-grid"><div className="form-field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" maxLength={254}/></div><div className="form-field"><label htmlFor="phone">Phone / WhatsApp</label><input id="phone" name="phone" type="tel" maxLength={40}/></div></div><div className="form-field"><label htmlFor="message">Message</label><textarea id="message" name="message" required maxLength={5000} defaultValue={"I am interested in "+row.title+". Please share current availability and next steps."}/></div><button className="button" type="submit">Send enquiry <ArrowUpRight size={14}/></button></form></div>
 </div></section></main><SiteFooter/></>;
}
