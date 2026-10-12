import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BlogPostForm } from "@/components/blog-post-form";
import { saveBlogPost } from "@/app/admin/blog/actions";

type Props = { params: Promise<{id:string}>; searchParams: Promise<{error?:string}> };
export default async function EditBlogPostPage({params,searchParams}:Props) {
  const {id} = await params;
  const query = await searchParams;
  const db = await createClient();
  const {data:post} = await db.from("blog_posts").select("id,title,slug,excerpt,content,category,tags,cover_image_url,seo_title,seo_description,canonical_url,status").eq("id",id).maybeSingle();
  if (!post) notFound();
  return <>
    <div className="admin-heading"><div><div className="eyebrow">Editorial studio</div><h1>Edit article</h1><p>Update content and metadata, or archive the post.</p></div><Link href="/admin/blog" className="text-link"><ArrowLeft size={13}/> Back to journal</Link></div>
    <BlogPostForm action={saveBlogPost} post={post} error={query.error}/>
  </>;
}
