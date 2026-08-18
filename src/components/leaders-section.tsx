"use client"

import Image from "next/image"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import { useLanguage } from "@/components/language-context"
import { translations } from "@/lib/translations"

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

export function LeadersSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal()
  const { ref: gridRef, isVisible: gridVisible } = useScrollReveal(0.1)
  const { language } = useLanguage()
  const t = translations[language].leaders

  // Edit names here. To add a photo, drop the file in public/images/leaders/
  // and set image to e.g. "/images/leaders/jane-doe.jpg" (square crops work best).
  const leaders = [
    { name: "Full Name", role: t.roles.chairperson, image: "", delay: "" },
    { name: "Full Name", role: t.roles.secretary, image: "", delay: "delay-100" },
    { name: "Full Name", role: t.roles.treasurer, image: "", delay: "delay-200" },
  ]

  return (
    <section id="leaders" className="relative scroll-mt-24 bg-muted py-16 md:py-20 overflow-hidden">
      {/* Subtle radial gradient background for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(133,55%,40%,0.05),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(200,72%,55%,0.05),transparent_60%)]" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div ref={headerRef} className={`mx-auto max-w-2xl text-center transition-all ${headerVisible ? "animate-fade-in-up" : "opacity-0"}`}>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            {t.badge}
          </p>
          <h2 className="mt-3 text-balance font-serif text-2xl font-bold text-foreground sm:text-3xl">
            {t.title}
          </h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            {t.description}
          </p>
        </div>

        {/* Leaders grid */}
        <div ref={gridRef} className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
          {leaders.map((leader) => (
            <div
              key={leader.role}
              className={`group mx-auto w-full max-w-xs rounded-2xl border border-border/50 bg-card/80 p-6 text-center shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg sm:max-w-none ${gridVisible ? `animate-fade-in-up ${leader.delay}` : "opacity-0"}`}
            >
              {/* Portrait — circular, holds a photo or the initials fallback */}
              <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 ring-4 ring-primary/10">
                {leader.image ? (
                  <Image
                    src={leader.image}
                    alt={leader.name}
                    fill
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    sizes="96px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="font-serif text-2xl font-bold text-primary">
                      {getInitials(leader.name)}
                    </span>
                  </div>
                )}
              </div>

              {/* Name & role */}
              <h3 className="mt-4 font-serif text-lg font-bold text-foreground">
                {leader.name}
              </h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-primary">
                {leader.role}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
