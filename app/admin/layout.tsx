import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, BookOpen, FilePlus2, Gem, Inbox, LayoutDashboard, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/marketplace";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export default async function AdminLayout({children}:{children:React.ReactNode}){
 if(!hasSupabaseConfig())redirect("/auth/login");const db=await createClient();const {data}=await db.auth.getUser();if(!data.user)redirect("/auth/login?next=/admin");
 const {data:isAdmin,error}=await db.rpc("is_admin");if(error||isAdmin!==true)redirect("/");
 return <><SiteHeader/><div className="admin-shell"><aside className="admin-sidebar"><span className="sidebar-label">Sellfast workspace</span><Link href="/admin"><LayoutDashboard size={15}/> Overview</Link><Link href="/admin/listings"><Gem size={15}/> Inventory</Link><Link href="/admin/listings/new"><FilePlus2 size={15}/> Add a watch</Link><Link href="/admin/sellers"><Users size={15}/> Seller approvals</Link><Link href="/admin/inquiries"><Inbox size={15}/> Enquiries</Link><Link href="/admin/brands"><BarChart3 size={15}/> Brands</Link><Link href="/admin/blog"><BookOpen size={15}/> Journal & SEO</Link><span className="sidebar-label">Storefront</span><Link href="/watches">View live shop ↗</Link><Link href="/seller/dashboard">Seller workspace ↗</Link></aside><section className="admin-main">{children}</section></div><SiteFooter/></>;
}
