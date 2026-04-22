"use client"

import { HandHeart, GraduationCap, Stethoscope, PartyPopper, Landmark, Handshake } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import { useLanguage } from "@/components/language-context"
import { translations } from "@/lib/translations"

export function ProgramsSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal()
  const { ref: gridRef, isVisible: gridVisible } = useScrollReveal(0.1)
  const { language } = useLanguage()
  const t = translations[language].programs

  const programs = [
    {
      icon: HandHeart,
      title: t.list.bereavement.title,
      description: t.list.bereavement.description,
      color: "bg-primary/10 text-primary",
      delay: "delay-0"
    },
    {
      icon: GraduationCap,
      title: t.list.education.title,
      description: t.list.education.description,
      color: "bg-secondary/10 text-secondary",
      delay: "delay-100"
    },
    {
      icon: Stethoscope,
      title: t.list.health.title,
      description: t.list.health.description,
      color: "bg-accent/20 text-accent-foreground",
      delay: "delay-200"
    },
    {
      icon: PartyPopper,
      title: t.list.cultural.title,
      description: t.list.cultural.description,
      color: "bg-primary/10 text-primary",
      delay: "delay-300"
    },
    {
      icon: Landmark,
      title: t.list.civic.title,
      description: t.list.civic.description,
      color: "bg-secondary/10 text-secondary",
      delay: "delay-400"
    },
    {
      icon: Handshake,
      title: t.list.newArrivals.title,
      description: t.list.newArrivals.description,
      color: "bg-accent/20 text-accent-foreground",
      delay: "delay-500"
    },
  ]

  return (
    <section id="programs" className="relative bg-muted py-24 md:py-32 overflow-hidden">
      {/* Subtle radial gradient background for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(133,55%,40%,0.05),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(200,72%,55%,0.05),transparent_60%)]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div ref={headerRef} className={`mx-auto max-w-3xl text-center ${headerVisible ? "animate-fade-in-up" : "opacity-0"}`}>
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

        <div ref={gridRef} className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <div
              key={program.title}
              className={`flex gap-5 rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm p-6 transition-all duration-300 ${gridVisible ? `animate-fade-in-up ${program.delay}` : "opacity-0"}`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 ${program.color}`}
              >
                <program.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{program.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {program.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

