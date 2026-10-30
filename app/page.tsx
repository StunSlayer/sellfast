import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock3, Gem, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Brand, Listing, hasSupabaseConfig, publicListingImage } from "@/lib/marketplace";
import { WatchCard } from "@/components/watch-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const popularBrands: Brand[] = [
  { id: "rolex", name: "Rolex", slug: "rolex" }, { id: "patek", name: "Patek Philippe", slug: "patek-philippe" },
  { id: "ap", name: "Audemars Piguet", slug: "audemars-piguet" }, { id: "cartier", name: "Cartier", slug: "cartier" },
  { id: "omega", name: "Omega", slug: "omega" }, { id: "rm", name: "Richard Mille", slug: "richard-mille" },
  { id: "tudor", name: "Tudor", slug: "tudor" }, { id: "iwc", name: "IWC Schaffhausen", slug: "iwc-schaffhausen" },
  { id: "breitling", name: "Breitling", slug: "breitling" }, { id: "tag", name: "TAG Heuer", slug: "tag-heuer" },
  { id: "jlc", name: "Jaeger-LeCoultre", slug: "jaeger-lecoultre" }, { id: "vc", name: "Vacheron Constantin", slug: "vacheron-constantin" },
];

export default async function HomePage() {
  let listings: Listing[] = [];
  let brands: Brand[] = popularBrands;
  let heroImageUrl: string | null = null;
  let heroImageAlt = "Luxury watch collection";
  let sellFeatureImageUrl: string | null = null;
  let sellFeatureImageAlt = "Luxury watch available to sell or trade";
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { data } = await supabase.from("listings").select("*, brand:brands(name, slug), listing_images(*)").eq("status", "published").eq("availability", "available").order("published_at", { ascending: false, nullsFirst: false }).limit(8);
    listings = (data || []) as unknown as Listing[];
    const { data: rows } = await supabase.from("brands").select("id,name,slug,sort_order").eq("is_active", true).order("sort_order").limit(12);
    if (rows?.length) brands = rows as Brand[];
    const { data: homepageMedia } = await supabase.from("homepage_media").select("slot,storage_path,alt_text").in("slot", ["hero","sell_feature"]);
    for (const media of homepageMedia || []) {
      const publicUrl = supabase.storage.from("site-media").getPublicUrl(media.storage_path).data.publicUrl;
      if (media.slot === "hero") {
        heroImageUrl = publicUrl;
        heroImageAlt = media.alt_text || heroImageAlt;
      } else if (media.slot === "sell_feature") {
        sellFeatureImageUrl = publicUrl;
        sellFeatureImageAlt = media.alt_text || sellFeatureImageAlt;
      }
    }
  }
  const imageUrls = new Map<string, string>();
  if (hasSupabaseConfig() && listings.length) {
    const supabase = await createClient();
    listings.forEach((listing) => imageUrls.set(listing.id, publicListingImage(supabase, listing)));
  }

  return <>
    <SiteHeader />
    <main>
      <section className={"hero"+(heroImageUrl?" hero-managed-image":"")}>{heroImageUrl?<img className="hero-custom-image" src={heroImageUrl} alt={heroImageAlt}/>:null}<div className="hero-content">
        <div className="eyebrow">The art of choosing well</div>
        <h1 className="display">Exceptional watches.<br /><em>Extraordinary stories.</em></h1>
        <p className="hero-copy">A considered collection of fine timepieces, thoughtfully sourced for those who know what matters. Discover, enquire, sell or trade with Sellfast.</p>
        <div className="hero-actions"><Link className="button button-light" href="/watches">Explore the collection <ArrowRight size={15}/></Link><Link className="button button-dark-outline" href="/sell-your-watch">Sell your watch <ArrowUpRight size={14}/></Link></div>
        <div className="hero-note"><span><ShieldCheck size={15}/> Considered curation</span><span><MessageCircle size={15}/> Personal concierge</span><span><Clock3 size={15}/> By appointment</span></div>
      </div></section>
      <section className="trust-row"><div className="container trust-grid">
        <div className="trust-item"><ShieldCheck size={22}/><div><strong>Carefully reviewed</strong><span>Listings moderated by our team</span></div></div>
        <div className="trust-item"><Gem size={22}/><div><strong>Curated timepieces</strong><span>Quality over quantity</span></div></div>
        <div className="trust-item"><MessageCircle size={22}/><div><strong>Human concierge</strong><span>Direct answers, no guesswork</span></div></div>
        <div className="trust-item"><Truck size={22}/><div><strong>Clear next steps</strong><span>Arrange viewing and delivery</span></div></div>
      </div></section>
      <section className="section"><div className="container">
        <div className="section-head"><div><div className="eyebrow">Freshly listed</div><h2 className="display">New arrivals</h2><p>Pieces currently available to enquire about. Listings are drawn from our live inventory.</p></div><Link href="/watches" className="text-link">View all watches <ArrowRight size={14}/></Link></div>
        <div className="watch-grid">{listings.length ? listings.map((listing) => <WatchCard key={listing.id} listing={listing} imageUrl={imageUrls.get(listing.id) || ""}/>) : <div className="empty-state"><h3>The collection is being curated.</h3><p>Our next pieces will appear here as soon as they are published. Speak with the concierge to register a request or enquire about listing a timepiece of your own.</p><div className="hero-actions" style={{justifyContent:"center",marginTop:18}}><Link className="button" href="/contact">Request a watch</Link><Link className="button button-outline" href="/sell-your-watch">Sell or trade</Link></div></div>}</div>
      </div></section>
      <section className="brands-section section-tight"><div className="container">
        <div className="section-head"><div><div className="eyebrow">A world of watchmaking</div><h2 className="display">Shop by brand</h2><p>Explore enduring icons and independent visionaries.</p></div><Link href="/watches" className="text-link">Browse collection <ArrowRight size={14}/></Link></div>
        <div className="brand-grid">{brands.slice(0,12).map((brand) => <Link href={"/watches?brand="+brand.slug} className="brand-tile" key={brand.id}><span className="brand-monogram">{brand.name.split(/[\s&]+/).filter(Boolean).map((part)=>part[0]).slice(0,2).join("")}</span><span>{brand.name}</span></Link>)}</div>
      </div></section>
      <section className="section"><div className="container split-feature"><div className="split-art" role="img" aria-label={sellFeatureImageAlt} style={sellFeatureImageUrl?{backgroundImage:`url("${sellFeatureImageUrl}")`}:undefined}/><div className="split-copy"><div><div className="eyebrow">Your next chapter</div><h2 className="display">Ready for a different wrist?</h2><p>Sell or trade your watch with a team that understands the details. Share the reference, condition and what comes with it. We will review the information and get back to you personally.</p><Link className="button button-light" href="/sell-your-watch">Start an enquiry <ArrowRight size={14}/></Link></div></div></div></section>
      <section className="section-tight"><div className="container"><div className="section-head"><div><div className="eyebrow">Simple by design</div><h2 className="display">A more personal way to buy</h2></div></div><div className="process-grid">
        <div className="process-item"><span className="process-number">01</span><h3>Discover</h3><p>Explore available watches and open each listing for its details, condition and reference.</p></div>
        <div className="process-item"><span className="process-number">02</span><h3>Ask the right questions</h3><p>Message the concierge about availability, further photographs or to arrange a viewing.</p></div>
        <div className="process-item"><span className="process-number">03</span><h3>Make it yours</h3><p>Confirm the details and agree next steps directly with the team before arranging payment and delivery.</p></div>
      </div></div></section>
    </main>
    <SiteFooter />
  </>;
}
