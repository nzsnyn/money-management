/** @type {import('next').NextConfig} */

const nextConfig = {
  /* config options here */
  experimental: {
    serverActions: true,
  },
  typescript: {
    // !! WARN !!
    // Hanya untuk pengembangan - jangan digunakan di production
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // Menonaktifkan ESLint selama build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Tambahkan output standalone untuk optimasi di Vercel
  output: 'standalone',
}

module.exports = nextConfig
