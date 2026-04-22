"use client"

import { Heart, Users, Globe, Shield } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import { useLanguage } from "@/components/language-context"
import { translations } from "@/lib/translations"

export function AboutSection() {
  const { ref, isVisible } = useScrollReveal()
  const { language } = useLanguage()
  const t = translations[language].about

  const values = [
    {
      icon: Heart,
      title: t.values.mutualAid.title,
      description: t.values.mutualAid.description,
    },
    {
      icon: Users,
      title: t.values.community.title,
      description: t.values.community.description,
    },
    {
      icon: Globe,
      title: t.values.heritage.title,
      description: t.values.heritage.description,
    },
    {
      icon: Shield,
      title: t.values.support.title,
      description: t.values.support.description,
    },
  ]

  const delays = ["", "delay-100", "delay-200", "delay-300"]

  return (
    <section id="about" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div ref={ref} className={`mx-auto max-w-3xl text-center transition-all ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            {t.badge}
          </p>
          <h2 className="mt-3 text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            {t.title}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            {t.description}
          </p>
        </div>

        {/* Values grid */}
        <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value, i) => (
            <div
              key={value.title}
              className={`rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 transition-all duration-300 ${isVisible ? `animate-fade-in-up ${delays[i]}` : "opacity-0"}`}
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300">
                <value.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{value.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

