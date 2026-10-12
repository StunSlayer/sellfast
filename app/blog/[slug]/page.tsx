import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/marketplace";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://sellfast.in").replace(/\/$/, "");
type Post = {
  id: string; title: string; slug: string; excerpt: string; content: string; category: string;
  tags: string[] | null; cover_image_url: string | null; seo_title: string | null;
  seo_description: string | null; canonical_url: string | null; status: string;
  published_at: string | null; updated_at: string;
};

async function getPost(slug: string): Promise<Post | null> {
  if (!hasSupabaseConfig()) return null;
  const db = await createClient();
  const { data } = await db.from("blog_posts")
    .select("id,title,slug,excerpt,content,category,tags,cover_image_url,seo_title,seo_description,canonical_url,status,published_at,updated_at")
    .eq("slug", slug).eq("status", "published").not("published_at", "is", null).maybeSingle();
  return data as Post | null;
}

export async function generateMetadata({ params }: { params: Promise<{slug:string}> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Article not found | Sellfast", robots: { index: false, follow: false } };
  const title = (post.seo_title || post.title).slice(0, 70);
  const description = (post.seo_description || post.excerpt).replace(/\s+/g, " ").trim().slice(0, 160);
  const canonical = post.canonical_url || base + "/blog/" + post.slug;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      siteName: "Sellfast",
      title,
      description,
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at,
      authors: ["Sellfast"],
      images: post.cover_image_url ? [{ url: post.cover_image_url, alt: post.title }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: post.cover_image_url ? [post.cover_image_url] : undefined },
    robots: { index: true, follow: true, "max-image-preview": "large" },
  };
}

function renderContent(content: string) {
  const blocks = content.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  return blocks.map((block, index) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines[0]?.startsWith("### ")) return <h3 key={index}>{lines[0].slice(4)}{lines.length > 1 ? <span className="blog-inline-tail">{" " + lines.slice(1).join(" ")}</span> : null}</h3>;
    if (lines[0]?.startsWith("## ")) return <h2 key={index}>{lines[0].slice(3)}{lines.length > 1 ? <span className="blog-inline-tail">{" " + lines.slice(1).join(" ")}</span> : null}</h2>;
    if (lines.every((line) => line.startsWith("- "))) return <ul key={index}>{lines.map((line, i) => <li key={i}>{line.slice(2)}</li>)}</ul>;
    return <p key={index}>{lines.join(" ")}</p>;
  });
}

export default async function BlogArticlePage({ params }: { params: Promise<{slug:string}> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const canonical = post.canonical_url || base + "/blog/" + post.slug;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seo_description || post.excerpt,
    image: post.cover_image_url ? [post.cover_image_url] : undefined,
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at,
    mainEntityOfPage: canonical,
    url: canonical,
    articleSection: post.category,
    keywords: (post.tags || []).join(", ") || undefined,
    author: { "@type": "Organization", name: "Sellfast", url: base },
    publisher: { "@type": "Organization", name: "Sellfast", url: base },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base + "/" },
      { "@type": "ListItem", position: 2, name: "Journal", item: base + "/blog" },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c") }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }} />
    <SiteHeader />
    <main>
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><Link href="/blog">Journal</Link><span>/</span><span>{post.title}</span></div>
          <div className="eyebrow">{post.category}</div>
          <h1 className="display">{post.title}</h1>
          <p>{post.excerpt}</p>
          <div className="blog-date"><CalendarDays size={14}/>{post.published_at ? new Date(post.published_at).toLocaleDateString("en-AE",{day:"numeric",month:"long",year:"numeric"}) : "Sellfast journal"}</div>
        </div>
      </section>
      <article className="container blog-article">
        {post.cover_image_url ? <img className="blog-hero-image" src={post.cover_image_url} alt={post.title} /> : null}
        <div className="blog-prose">{renderContent(post.content)}</div>
        {(post.tags || []).length ? <div className="blog-tags">{(post.tags || []).map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
        <div className="blog-article-footer"><Link href="/blog" className="text-link"><ArrowLeft size={14}/> Back to journal</Link><Link href="/watches" className="text-link">Explore watches ↗</Link></div>
      </article>
    </main>
    <SiteFooter />
  </>;
}
