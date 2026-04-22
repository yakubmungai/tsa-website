"use client"

import Image from "next/image"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import { useLanguage } from "@/components/language-context"
import { translations } from "@/lib/translations"

export function ImpactSection() {
  const { ref: imgRef, isVisible: imgVisible } = useScrollReveal()
  const { ref: contentRef, isVisible: contentVisible } = useScrollReveal()
  const { language } = useLanguage()
  const t = translations[language].impact

  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Image side */}
          <div ref={imgRef} className={`relative ${imgVisible ? "animate-fade-in-up" : "opacity-0"}`}>
            <div className="relative h-[400px] overflow-hidden rounded-3xl shadow-xl md:h-[500px]">
              <Image
                src="/images/impact-community.png"
                alt="Tanzanian community in US"
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            {/* Floating stat card with glow */}
            <div className="absolute -bottom-6 -right-4 rounded-2xl border border-border bg-card p-6 shadow-xl animate-glow-pulse md:-right-8">
              <p className="text-3xl font-bold text-primary">{t.stats.activeMembers.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.stats.activeMembers.label}</p>
            </div>
          </div>

          {/* Content side */}
          <div ref={contentRef} className={contentVisible ? "animate-fade-in-up delay-200" : "opacity-0"}>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              {t.badge}
            </p>
            <h2 className="mt-3 text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl">
              {t.title}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {t.description}
            </p>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <p className="text-4xl font-bold text-foreground">
                  {t.stats.distributed.value}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t.stats.distributed.label}
                </p>
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground">
                  {t.stats.families.value}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t.stats.families.label}
                </p>
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground">
                  {t.stats.cities.value}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t.stats.cities.label}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

