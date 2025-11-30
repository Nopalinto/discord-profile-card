/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed static export to enable dynamic metadata and API routes
  // Explicitly NOT using output: 'export' to enable server-side rendering
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Ensure Vercel treats this as a Next.js app, not static export
  output: undefined, // Explicitly undefined, not 'export'
}

module.exports = nextConfig

