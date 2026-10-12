import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BlogPostForm } from "@/components/blog-post-form";
import { saveBlogPost } from "@/app/admin/blog/actions";

type Props = { searchParams: Promise<{error?:string}> };
export default async function NewBlogPostPage({searchParams}:Props) {
  const params = await searchParams;
  return <>
    <div className="admin-heading"><div><div className="eyebrow">Editorial studio</div><h1>Write an article</h1><p>Save a private draft or publish it to the public journal.</p></div><Link href="/admin/blog" className="text-link"><ArrowLeft size={13}/> Back to journal</Link></div>
    <BlogPostForm action={saveBlogPost} error={params.error}/>
  </>;
}
