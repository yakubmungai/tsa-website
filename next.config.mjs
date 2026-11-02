/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      // The default Server Action body limit is 1MB, which rejects most phone
      // photos of an ID. Vercel caps request bodies at 4.5MB regardless, so the
      // membership form shrinks images to fit under that (see src/lib/upload.ts).
      bodySizeLimit: '5mb',
    },
  },
}

export default nextConfig
