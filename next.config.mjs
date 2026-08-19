/**
 * Security headers.
 *
 * The site holds member addresses, dates of birth and financial records, so
 * these are the baseline rather than a nicety.
 *
 * CSP is deliberately absent for now: the layout embeds an inline JSON-LD
 * block and Next emits its own inline bootstrap, so a policy strict enough to
 * be worth having needs nonces generated in middleware. Adding a permissive
 * one now would give the appearance of protection without the substance.
 */
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
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
