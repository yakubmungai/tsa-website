/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root. A stray C:\Dev\package-lock.json outside the repo
  // was being inferred as the root, which resolves dependencies from the wrong
  // tree.
  turbopack: {
    root: import.meta.dirname,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      // The membership application accepts an ID photo up to 10MB, but the
      // default Server Action body limit is 1MB — so real phone photos were
      // failing with an opaque error.
      bodySizeLimit: '12mb',
    },
  },
}

export default nextConfig
