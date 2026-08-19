import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The portal and admin sit behind auth, but they should not be crawled
      // or appear in search results either.
      disallow: ['/api/', '/portal/', '/admin/', '/login', '/signup'],
    },
    sitemap: 'https://tansha.org/sitemap.xml',
  }
}
