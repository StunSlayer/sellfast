import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Listing forms send image files through Server Actions. A listing can
    // include multiple photos, each up to 10 MB, so allow a larger request.
    serverActions: {
      bodySizeLimit: "50mb",
    },
    // Sellfast's proxy refreshes Supabase sessions on these requests too.
    // Increase its buffer to avoid truncating multi-image form submissions.
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
