import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "./marketplace-overrides.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const geistSans = Geist({ variable: "--font-geist-sans", display: "swap", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Sellfast | Curated Luxury Watches in Dubai", template: "%s | Sellfast" },
  description: "Discover exceptional luxury watches, enquire directly, or sell and trade your timepiece with Sellfast in Dubai.",
  applicationName: "Sellfast",
  openGraph: { title: "Sellfast | Curated Luxury Watches", description: "Discover, buy, sell and trade exceptional timepieces in Dubai.", type: "website", locale: "en_AE" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body className={geistSans.className}>{children}</body></html>;
}
