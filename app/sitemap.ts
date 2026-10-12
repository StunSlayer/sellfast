import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/marketplace";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://sellfast.in").replace(/\/$/, "");
  const staticRoutes = [
    ["", 1],
    ["/watches", 0.9],
    ["/blog", 0.85],
    ["/sell-your-watch", 0.7],
    ["/about", 0.6],
    ["/contact", 0.6],
    ["/faq", 0.6],
    ["/become-a-seller", 0.5],
    ["/privacy", 0.3],
    ["/terms", 0.3],
  ] as const;

  const entries: MetadataRoute.Sitemap = staticRoutes.map(([route, priority]) => ({
    url: base + route,
    changeFrequency: route === "" ? "daily" : route === "/watches" || route === "/blog" ? "daily" : "monthly",
    priority,
  }));

  if (!hasSupabaseConfig()) return entries;

  const db = await createClient();
  const [{ data: listings }, { data: posts }] = await Promise.all([
    db.from("listings").select("slug,updated_at").eq("status", "published").limit(5000),
    db.from("blog_posts").select("slug,updated_at,published_at").eq("status", "published").not("published_at", "is", null).order("published_at", { ascending: false }).limit(5000),
  ]);

  for (const item of listings || []) {
    entries.push({
      url: base + "/watches/" + item.slug,
      lastModified: item.updated_at ? new Date(item.updated_at) : undefined,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  for (const post of posts || []) {
    entries.push({
      url: base + "/blog/" + post.slug,
      lastModified: post.updated_at ? new Date(post.updated_at) : post.published_at ? new Date(post.published_at) : undefined,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return entries;
}
