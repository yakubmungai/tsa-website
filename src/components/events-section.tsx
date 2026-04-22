"use client"

import { Calendar, MapPin, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-context"
import { translations } from "@/lib/translations"

export function EventsSection() {
  const { language } = useLanguage()
  const t = translations[language].events

  return (
    <section id="events" className="bg-muted py-24 md:py-32 min-h-[70vh] flex items-center">
      <div className="mx-auto max-w-7xl px-6 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary animate-fade-in-up">
            {t.badge}
          </p>
          <h2 className="mt-3 text-balance font-serif text-4xl font-bold text-foreground sm:text-5xl md:text-6xl animate-fade-in-up delay-100">
            {t.title}
          </h2>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 md:p-16 text-center shadow-xl animate-fade-in-up delay-200">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-secondary/5 blur-3xl" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Calendar className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              {language === "en" ? "Coming Soon" : "Hivi Karibuni"}
            </h3>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {t.comingSoon}
            </p>
            
            <div className="mt-10 flex justify-center">
              <Button
                asChild
                className="btn-shimmer text-primary-foreground border-0 px-12 h-12"
              >
                <a href="/">{language === "en" ? "Back to Home" : "Rudi Nyumbani"}</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

