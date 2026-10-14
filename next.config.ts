import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
  experimental: {
    middlewareClientMaxBodySize: "110mb",
  },
};

export default nextConfig;
