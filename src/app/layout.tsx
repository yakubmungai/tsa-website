import React from "react"
import type { Metadata, Viewport } from 'next'
import { Public_Sans, Merriweather } from 'next/font/google'

import './globals.css'
import { LanguageProvider } from "@/components/language-context"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"

const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-public-sans' })
const merriweather = Merriweather({
  weight: ['300', '400', '700', '900'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-merriweather',
})

export const metadata: Metadata = {
  title: {
    default: 'Tanzania Sharing Association | US Diaspora Mutual-Aid Society',
    template: '%s | TSA'
  },
  icons: {
    icon: '/TSA_Logo-removebg-preview.png',
    apple: '/TSA_Logo-removebg-preview.png',
  },
  description: 'The Tanzania Sharing Association (TSA) is a US-wide diaspora mutual-aid society uniting Tanzanians across America through community support, cultural preservation, and shared prosperity.',
  keywords: ['Tanzania Sharing Association', 'TSA', 'Tanzanian Diaspora', 'US Tanzanians', 'Mutual Aid Society', 'Tanzanian American', 'Community Support'],
  authors: [{ name: 'Tanzania Sharing Association' }],
  creator: 'Tanzania Sharing Association',
  publisher: 'Tanzania Sharing Association',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://tansha.org'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Tanzania Sharing Association | US Diaspora Mutual-Aid Society',
    description: 'Uniting Tanzanians across the United States through mutual aid, cultural connection, and community support.',
    url: 'https://tansha.org',
    siteName: 'TSA USA',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png', 
        width: 1200,
        height: 630,
        alt: 'Tanzania Sharing Association',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tanzania Sharing Association',
    description: 'Uniting Tanzanians across the United States through mutual aid and community support.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2E9E3E' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${publicSans.variable} ${merriweather.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Tanzania Sharing Association",
              "alternateName": "TSA",
              "url": "https://tansha.org",
              "logo": "https://tansha.org/TSA_Logo-removebg-preview.png",
              "description": "The Tanzania Sharing Association (TSA) is a US-wide diaspora mutual-aid society uniting Tanzanians across America through community support, cultural preservation, and shared prosperity.",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "US"
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "281-966-8284",
                "contactType": "general",
                "email": "tansha.hq@gmail.com"
              }
            })
          }}
        />
        <LanguageProvider>{children}</LanguageProvider>
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  )
}
