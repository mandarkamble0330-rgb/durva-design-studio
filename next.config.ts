import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 127.0.0.1 is a different host from localhost. Next blocks dev resources
  // (including hydration and HMR) unless this host is explicitly allowed.
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
