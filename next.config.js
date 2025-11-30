/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed static export to enable dynamic metadata and API routes
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
}

module.exports = nextConfig

