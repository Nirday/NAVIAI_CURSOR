import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Explicitly disable Turbopack for production builds
  // Next.js 16 enables Turbopack by default, but it's still experimental
  // Using webpack for more stable builds
  
  webpack: (config, { isServer }) => {
    // Mark Node.js built-in modules as external for client-side builds
    // These are used by server-side libraries like Twilio
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
