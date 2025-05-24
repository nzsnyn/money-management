import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: true,
  },
  typescript: {
    // !! WARN !!
    // Ini hanya untuk pengembangan - jangan digunakan di production
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
