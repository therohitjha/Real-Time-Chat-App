/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empty turbopack config to silence the warning
  turbopack: {},

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Only enable static export when building for Capacitor
  // Comment this out during development
  // output: 'export',
  // trailingSlash: true,
};

module.exports = nextConfig;
