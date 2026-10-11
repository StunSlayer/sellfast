import Link from "next/link";
import { ArrowRight, Clock3, Gem, Inbox, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatAED } from "@/lib/marketplace";
export default async function AdminOverview(){
 const db=await createClient();
 const [{count:listings},{count:available},{count:pendingSellers},{count:openInquiries},{data:recent}] = await Promise.all([
  db.from("listings").select("id",{count:"exact",head:true}),
  db.from("listings").select("id",{count:"exact",head:true}).eq("status","published").eq("availability","available"),
  db.from("seller_profiles").select("user_id",{count:"exact",head:true}).eq("status","pending"),
  db.from("inquiries").select("id",{count:"exact",head:true}).in("status",["new","contacted","qualified"]),
  db.from("inquiries").select("id,full_name,email,phone,message,status,created_at,inquiry_type").order("created_at",{ascending:false}).limit(5)
 ]);
 return <><div className="admin-heading"><div><div className="eyebrow">Control room</div><h1>Good to see you.</h1><p>Manage inventory, review sellers and follow up on buyer enquiries.</p></div><Link className="button" href="/admin/listings/new">Add a watch <ArrowRight size={14}/></Link></div>
 <div className="stat-grid"><div className="stat-card"><span>Total inventory</span><strong>{listings??0}</strong><Link className="text-link" href="/admin/listings">View inventory</Link></div><div className="stat-card"><span>Live & available</span><strong>{available??0}</strong><Link className="text-link" href="/watches">View storefront</Link></div><div className="stat-card"><span>Pending sellers</span><strong>{pendingSellers??0}</strong><Link className="text-link" href="/admin/sellers">Review applications</Link></div><div className="stat-card"><span>Open enquiries</span><strong>{openInquiries??0}</strong><Link className="text-link" href="/admin/inquiries">Manage leads</Link></div></div>
 <div className="section-head" style={{marginTop:35}}><div><div className="eyebrow">Recent activity</div><h2 className="display" style={{fontSize:32}}>Latest enquiries</h2></div><Link href="/admin/inquiries" className="text-link">All enquiries <ArrowRight size={14}/></Link></div>
 <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Enquiry</th><th>Type</th><th>Received</th><th>Status</th><th></th></tr></thead><tbody>{(recent||[]).map(row=><tr key={row.id}><td><strong>{row.full_name}</strong><span className="table-sub">{row.email||row.phone||"No contact"}</span><span className="table-sub">{row.message.slice(0,90)}{row.message.length>90?"…":""}</span></td><td>{row.inquiry_type.replace("_"," ")}</td><td>{new Date(row.created_at).toLocaleDateString("en-AE")}</td><td><span className={"status-pill "+row.status}>{row.status}</span></td><td><Link className="text-link" href="/admin/inquiries">Open <ArrowRight size={12}/></Link></td></tr>)}</tbody></table>{!recent?.length?<div className="empty-state"><h3>No enquiries yet.</h3><p>Buyer and seller submissions will be tracked here.</p></div>:null}</div>
 <div className="process-grid" style={{marginTop:25}}><div className="process-item"><Gem size={20} color="#8c7447"/><h3>Build the catalogue</h3><p>Add your owned stock, create listing details and upload clear photographs.</p><Link href="/admin/listings/new" className="text-link" style={{marginTop:16}}>Add inventory <ArrowRight size={13}/></Link></div><div className="process-item"><Users size={20} color="#8c7447"/><h3>Review sellers</h3><p>Approve accounts before sellers can submit watches for moderation.</p><Link href="/admin/sellers" className="text-link" style={{marginTop:16}}>Seller queue <ArrowRight size={13}/></Link></div><div className="process-item"><Inbox size={20} color="#8c7447"/><h3>Follow through</h3><p>Track new leads and keep status current as your team contacts buyers.</p><Link href="/admin/inquiries" className="text-link" style={{marginTop:16}}>Lead queue <ArrowRight size={13}/></Link></div></div>
 </>;
}
