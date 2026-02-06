import React from "react"
import type { Metadata, Viewport } from 'next'
import { Public_Sans, Merriweather } from 'next/font/google'

import './globals.css'
import { LanguageProvider } from "@/components/language-context"
import { Toaster } from "@/components/ui/toaster"

const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-public-sans' })
const merriweather = Merriweather({
  weight: ['300', '400', '700', '900'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-merriweather',
})

export const metadata: Metadata = {
  title: 'Tanzania Sharing Association | Texas Diaspora Mutual-Aid Society',
  description: 'The Tanzania Sharing Association (TSA) is a Texas-based diaspora mutual-aid society uniting Tanzanians in America through community support, cultural preservation, and shared prosperity.',
}

export const viewport: Viewport = {
  themeColor: '#2E9E3E',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${publicSans.variable} ${merriweather.variable} font-sans antialiased`}>
        <LanguageProvider>{children}</LanguageProvider>
        <Toaster />
      </body>
    </html>
  )
}
