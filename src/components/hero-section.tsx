import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=2500&auto=format&fit=crop"
          alt="Beautiful landscape of Tanzania"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 from-20% via-black/40 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-card/20 bg-card/10 px-4 py-2 backdrop-blur-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm font-medium text-card">
              Texas-based Diaspora Mutual-Aid Society
            </span>
          </div>

          <h1 className="text-balance font-serif text-4xl font-bold leading-tight text-card sm:text-5xl md:text-6xl lg:text-7xl">
            Together We Uplift Our Community
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-card/80 md:text-xl">
            The Tanzania Sharing Association unites Tanzanians across Texas and beyond,
            providing mutual aid, cultural connection, and a bridge between home and the diaspora.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8"
            >
              <a href="#membership">
                Join Our Community
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-card/30 text-card hover:bg-card/10 text-base px-8 bg-transparent"
            >
              <a href="#about">Learn More</a>
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
