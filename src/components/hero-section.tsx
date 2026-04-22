"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Image from "next/image"
import { useLanguage } from "@/components/language-context"
import { translations } from "@/lib/translations"

export function HeroSection() {
  const { language } = useLanguage()
  const t = translations[language].hero

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-bg.png?v=3"
          alt="Tanzanian diaspora connection"
          fill
          priority
          className="object-cover animate-slow-zoom"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 from-20% via-black/40 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-card/20 bg-card/10 px-4 py-2 backdrop-blur-sm animate-fade-in-up">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm font-medium text-card">
              {t.badge}
            </span>
          </div>

          <h1 className="text-balance font-serif text-4xl font-bold leading-tight text-card sm:text-5xl md:text-6xl lg:text-7xl animate-fade-in-up delay-100">
            {t.title}
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-card/80 md:text-xl animate-fade-in-up delay-200">
            {t.description}
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row animate-fade-in-up delay-300">
            <Button
              asChild
              size="lg"
              className="btn-shimmer text-primary-foreground text-base px-8 border-0"
            >
              <a href="#membership">
                {t.ctaPrimary}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-card/30 text-card hover:bg-card/10 text-base px-8 bg-transparent backdrop-blur-sm"
            >
              <a href="#about">{t.ctaSecondary}</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative color bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex h-1.5">
        <div className="flex-1 bg-[hsl(133,55%,40%)]" />
        <div className="flex-1 bg-[hsl(200,72%,55%)]" />
        <div className="flex-1 bg-[hsl(45,92%,53%)]" />
        <div className="flex-1 bg-foreground" />
      </div>
    </section>
  )
}


