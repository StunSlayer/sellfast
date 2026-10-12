import Link from "next/link";
import { Clock3, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig, whatsappHref } from "@/lib/marketplace";
import { SignOutButton } from "@/components/sign-out-button";
export async function SiteHeader(){
 let signedIn=false,isAdmin=false;
 if(hasSupabaseConfig()){const supabase=await createClient();const {data}=await supabase.auth.getUser();signedIn=Boolean(data.user);if(data.user){const {data:role}=await supabase.rpc("is_admin");isAdmin=role===true}}
 return <>
  <div className="announcement">A considered way to buy, sell &amp; trade exceptional timepieces&nbsp; · &nbsp;<a href={whatsappHref("Hello Sellfast, I would like to enquire about a watch.")} target="_blank" rel="noreferrer">Speak to our concierge</a></div>
  <header className="site-header"><div className="container header-main">
   <nav className="header-links" aria-label="Main navigation"><Link href="/watches">Shop watches</Link><Link href="/sell-your-watch">Sell / trade</Link></nav>
   <Link href="/" className="wordmark" aria-label="Sellfast home"><span className="wordmark-main">Sellfast</span><span className="wordmark-sub">Timepieces · Dubai</span></Link>
   <div className="header-right"><Link href="/contact" className="header-action desktop-only"><MessageCircle size={15}/> Concierge</Link>{signedIn?<><Link href={isAdmin?"/admin":"/seller/dashboard"} className="header-action"><Clock3 size={15}/> Account</Link><SignOutButton /></>:<Link href="/auth/login" className="header-action"><Clock3 size={15}/> Sign in</Link>}</div>
  </div>
  <nav className="header-mobile" aria-label="Mobile navigation"><Link href="/watches">Shop watches</Link><Link href="/sell-your-watch">Sell / trade</Link><Link href="/become-a-seller">Dealer portal</Link><Link href="/about">Our approach</Link><Link href="/contact">Contact</Link></nav>
  </header>
 </>;
}
