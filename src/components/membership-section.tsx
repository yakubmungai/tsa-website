"use client"

import { Button } from "@/components/ui/button"
import { Check, ArrowRight } from "lucide-react"
import Image from "next/image"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import { useLanguage } from "@/components/language-context"
import { translations } from "@/lib/translations"

export function MembershipSection() {
  const { ref, isVisible } = useScrollReveal(0.1)
  const { language } = useLanguage()
  const t = translations[language].membershipSection

  return (
    <section id="membership" className="relative py-24 md:py-32 bg-muted overflow-hidden">
      {/* decorative gradient blob */}
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" />

      <div ref={ref} className={`relative mx-auto max-w-7xl px-6 ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
        <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
          <div className="grid lg:grid-cols-2">
            {/* Image side */}
            <div className="relative min-h-[300px] lg:min-h-0 overflow-hidden">
              <Image
                src="/images/membership-connection.png"
                alt="Tanzanian diaspora connection"
                fill
                className="object-cover transition-transform duration-700 hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-primary/20 to-transparent" />
            </div>

            {/* Content side */}
            <div className="p-8 md:p-12 lg:p-16">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                {t.badge}
              </p>
              <h2 className="mt-3 text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl">
                {t.title}
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                {t.description}
              </p>

              <ul className="mt-8 flex flex-col gap-3">
                {t.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 group">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="btn-shimmer text-primary-foreground border-0 group"
                >
                  <a href="/membership">
                    {t.ctaPrimary}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted bg-transparent"
                >
                  <a href="/constitution">{t.ctaSecondary}</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

