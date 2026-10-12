import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "./marketplace-overrides.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sellfast.in";
const geistSans = Geist({ variable: "--font-geist-sans", display: "swap", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Sellfast | Luxury Watches in Dubai", template: "%s | Sellfast" },
  description: "Discover luxury watches in Dubai, explore curated pre-owned and new timepieces, and buy, sell or trade with Sellfast's personal concierge.",
  applicationName: "Sellfast",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Sellfast | Luxury Watches in Dubai",
    description: "Discover, buy, sell and trade exceptional timepieces in Dubai with Sellfast.",
    type: "website",
    locale: "en_AE",
    url: siteUrl,
    siteName: "Sellfast",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sellfast | Luxury Watches in Dubai",
    description: "Discover, buy, sell and trade exceptional timepieces in Dubai with Sellfast.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sellfast",
    url: siteUrl,
    description: "Luxury watch marketplace and concierge in Dubai, United Arab Emirates.",
    areaServed: { "@type": "City", name: "Dubai" },
  };
  return (
    <html lang="en-AE" suppressHydrationWarning>
      <body className={geistSans.className}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} />
        {children}
      </body>
    </html>
  );
}
