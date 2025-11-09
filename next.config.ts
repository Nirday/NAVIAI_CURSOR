import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Explicitly disable Turbopack for production builds
  // Next.js 16 enables Turbopack by default, but it's still experimental
  // Using webpack for more stable builds
};

export default nextConfig;
