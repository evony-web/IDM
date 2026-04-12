import type { NextConfig } from "next";

// ── Fix DATABASE_URL for sandbox environment ──
// The sandbox sets a SQLite DATABASE_URL in system env,
// but we need PostgreSQL. Override it before anything loads.
if (process.env.DATABASE_URL?.startsWith("file:")) {
  process.env.DATABASE_URL =
    "postgresql://neondb_owner:npg_ZRWln0EV8bhX@ep-jolly-paper-an6zmh4b-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  process.env.DIRECT_DATABASE_URL =
    "postgresql://neondb_owner:npg_ZRWln0EV8bhX@ep-jolly-paper-an6zmh4b-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
}

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dagoryri5/image/upload/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dagoryri5/video/upload/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
    // Enable modern image formats
    formats: ["image/avif", "image/webp"],
    // Default device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
};

export default nextConfig;
