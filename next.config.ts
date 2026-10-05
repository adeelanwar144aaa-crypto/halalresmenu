import type { NextConfig } from "next";
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

function r2ImageRemotePattern():
  | { protocol: "https"; hostname: string; pathname: string }
  | null {
  const raw =
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim() ||
    process.env.R2_PUBLIC_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (u.protocol !== "https:" || !u.hostname) return null;
    return {
      protocol: "https",
      hostname: u.hostname,
      pathname: "/**",
    };
  } catch {
    return null;
  }
}

const r2Pattern = r2ImageRemotePattern();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
        pathname: "/**",
      },
      ...(r2Pattern ? [r2Pattern] : []),
    ],
  },
  experimental: {
    // disable build cache
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.cache = false;
    }
    return config;
  },
};

if (process.env.NODE_ENV === "development") {
  await setupDevPlatform();
}

export default nextConfig;
