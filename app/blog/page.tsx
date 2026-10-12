import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/marketplace";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://sellfast.in").replace(/\/$/, "");
export const metadata: Metadata = {
  title: "Luxury Watch Journal | Buying Guides, Care & Collecting",
  description: "Explore practical luxury watch buying guides, model explainers, collecting advice and care tips from Sellfast in Dubai.",
  alternates: { canonical: base + "/blog" },
  openGraph: {
    type: "website",
    url: base + "/blog",
    siteName: "Sellfast",
    title: "Luxury Watch Journal | Sellfast",
    description: "Luxury watch buying guides, collecting advice and care tips from Sellfast in Dubai.",
  },
  robots: { index: true, follow: true },
};

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  cover_image_url: string | null;
  published_at: string | null;
  tags: string[] | null;
};

export default async function BlogIndexPage() {
  let posts: BlogPost[] = [];
  if (hasSupabaseConfig()) {
    const db = await createClient();
    const { data } = await db
      .from("blog_posts")
      .select("id,title,slug,excerpt,category,cover_image_url,published_at,tags")
      .eq("status", "published")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(60);
    posts = (data || []) as BlogPost[];
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Sellfast Luxury Watch Journal",
    url: base + "/blog",
    description: "Luxury watch buying guides, collecting advice and care tips from Sellfast in Dubai.",
    publisher: { "@type": "Organization", name: "Sellfast", url: base },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: base + "/blog/" + post.slug,
      datePublished: post.published_at || undefined,
    })),
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <SiteHeader />
    <main>
      <section className="page-hero">
        <div className="container">
          <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>Journal</span></div>
          <div className="eyebrow">The Sellfast journal</div>
          <h1 className="display">A closer look at the world of watches.</h1>
          <p>Buying guides, reference explainers and considered advice for choosing, wearing and collecting fine timepieces in Dubai and beyond.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          {posts.length ? <div className="blog-grid">
            {posts.map((post) => <article className="blog-card" key={post.id}>
              <Link className="blog-card-image" href={"/blog/" + post.slug} aria-label={"Read " + post.title}>
                {post.cover_image_url ? <img src={post.cover_image_url} alt={post.title} loading="lazy" /> : <div className="blog-card-placeholder"><BookOpen size={30}/><span>SELLFAST JOURNAL</span></div>}
              </Link>
              <div className="blog-card-body">
                <div className="blog-meta"><span>{post.category}</span>{post.published_at ? <time dateTime={post.published_at}>{new Date(post.published_at).toLocaleDateString("en-AE",{day:"numeric",month:"short",year:"numeric"})}</time> : null}</div>
                <h2><Link href={"/blog/" + post.slug}>{post.title}</Link></h2>
                <p>{post.excerpt}</p>
                <Link className="text-link" href={"/blog/" + post.slug}>Read article <ArrowRight size={14}/></Link>
              </div>
            </article>)}
          </div> : <div className="empty-state"><h2>The journal is being prepared.</h2><p>Watch guides, collecting advice and new articles will appear here soon.</p><Link className="button" href="/watches">Explore the collection <ArrowRight size={14}/></Link></div>}
        </div>
      </section>
    </main>
    <SiteFooter />
  </>;
}
