import Link from "next/link";
import { ArrowRight, FilePlus2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{saved?:string}> };
export default async function AdminBlogPage({searchParams}:Props) {
  const params = await searchParams;
  const db = await createClient();
  const {data} = await db.from("blog_posts").select("id,title,slug,category,status,published_at,updated_at").order("updated_at",{ascending:false}).limit(200);
  const posts = data || [];
  return <>
    <div className="admin-heading"><div><div className="eyebrow">Editorial studio</div><h1>Journal & SEO</h1><p>Write articles, prepare drafts and publish search-friendly guides.</p></div><Link href="/admin/blog/new" className="button"><FilePlus2 size={15}/> New article</Link></div>
    {params.saved ? <div className="notice">Article saved. Published articles appear in the public journal and sitemap.</div> : null}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Article</th><th>Category</th><th>Status</th><th>Published</th><th>Last updated</th><th>Actions</th></tr></thead><tbody>
      {posts.map((post)=><tr key={post.id}>
        <td><strong>{post.title}</strong><span className="table-sub">/blog/{post.slug}</span></td>
        <td>{post.category}</td>
        <td><span className={"status-pill "+post.status}>{post.status}</span></td>
        <td>{post.published_at?new Date(post.published_at).toLocaleDateString("en-AE"):"—"}</td>
        <td>{new Date(post.updated_at).toLocaleDateString("en-AE")}</td>
        <td><div className="inline-actions"><Link className="mini-button" href={"/admin/blog/"+post.id+"/edit"}>Edit</Link>{post.status==="published"?<Link className="mini-button primary" href={"/blog/"+post.slug} target="_blank">View ↗</Link>:null}</div></td>
      </tr>)}
    </tbody></table>{!posts.length?<div className="empty-state"><h3>Your journal starts here.</h3><p>Create a draft, add a search title and description, then publish when ready.</p><Link href="/admin/blog/new" className="button">Write your first article <ArrowRight size={14}/></Link></div>:null}</div>
  </>;
}
