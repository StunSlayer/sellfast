"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/marketplace";

async function requireAdmin() {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/auth/login?next=/admin/blog");
  const { data: isAdmin, error } = await db.rpc("is_admin");
  if (error || isAdmin !== true) redirect("/");
  return { db, user: data.user };
}

function value(form: FormData, key: string, max = 5000) {
  return String(form.get(key) || "").trim().slice(0, max);
}

function safeCanonical(input: string) {
  if (!input) return null;
  try {
    const url = new URL(input);
    const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://sellfast.in");
    if (url.protocol !== "https:" || url.origin !== siteUrl.origin) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function saveBlogPost(form: FormData) {
  const { db, user } = await requireAdmin();
  const id = value(form, "id", 60);
  const title = value(form, "title", 180);
  const slug = slugify(value(form, "slug", 180) || title);
  const excerpt = value(form, "excerpt", 320);
  const content = value(form, "content", 50000);
  const category = value(form, "category", 80) || "Watch guides";
  const seoTitle = value(form, "seo_title", 180) || null;
  const seoDescription = value(form, "seo_description", 320) || null;
  const canonicalInput = value(form, "canonical_url", 500);
  const canonicalUrl = safeCanonical(canonicalInput);
  const coverImage = value(form, "cover_image_url", 1000);
  const status = value(form, "status", 20);
  const tags = value(form, "tags", 1000)
    .split(",")
    .map((tag) => tag.trim().slice(0, 50))
    .filter(Boolean)
    .slice(0, 15);

  if (
    title.length < 5 ||
    !slug ||
    excerpt.length < 30 ||
    content.length < 100 ||
    !["draft", "published", "archived"].includes(status) ||
    (canonicalInput && !canonicalUrl)
  ) {
    redirect(id ? "/admin/blog/" + id + "/edit?error=details" : "/admin/blog/new?error=details");
  }

  let existingPublishedAt: string | null = null;
  if (id) {
    const { data: existing } = await db
      .from("blog_posts")
      .select("published_at")
      .eq("id", id)
      .maybeSingle();
    existingPublishedAt = existing?.published_at || null;
  }
  const publishedAt = status === "published" ? existingPublishedAt || new Date().toISOString() : existingPublishedAt;
  const record = {
    author_id: user.id,
    title,
    slug,
    excerpt,
    content,
    category,
    tags,
    cover_image_url: coverImage || null,
    seo_title: seoTitle,
    seo_description: seoDescription,
    canonical_url: canonicalUrl,
    status,
    published_at: publishedAt,
  };

  if (id) {
    const { error } = await db.from("blog_posts").update(record).eq("id", id);
    if (error) redirect("/admin/blog/" + id + "/edit?error=save");
  } else {
    const { error } = await db.from("blog_posts").insert(record);
    if (error) redirect("/admin/blog/new?error=save");
  }

  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  revalidatePath("/");
  revalidatePath("/admin/blog");
  redirect("/admin/blog?saved=1");
}
