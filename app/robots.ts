import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://sellfast.in").replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/watches", "/blog", "/sell-your-watch", "/about", "/contact", "/faq", "/privacy", "/terms"],
      disallow: ["/admin", "/seller", "/auth"],
    },
    sitemap: base + "/sitemap.xml",
  };
}
