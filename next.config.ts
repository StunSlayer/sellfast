import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Listing forms send image files through Server Actions. Each image may be
    // up to 10 MB, so use a larger request limit than Next.js's 1 MB default.
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
