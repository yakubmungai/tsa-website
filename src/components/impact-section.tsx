export function ImpactSection() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Image side */}
          <div className="relative">
            <div className="overflow-hidden rounded-3xl">
              <img
                src="https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=2000&auto=format&fit=crop"
                alt="Community members joining hands in unity"
                className="h-full w-full object-cover"
              />
            </div>
            {/* Floating stat card */}
            <div className="absolute -bottom-6 -right-4 rounded-2xl border border-border bg-card p-6 shadow-xl md:-right-8">
              <p className="text-3xl font-bold text-primary">100+</p>
              <p className="mt-1 text-sm text-muted-foreground">Active Members</p>
            </div>
          </div>

          {/* Content side */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Our Impact
            </p>
            <h2 className="mt-3 text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl">
              Building a Stronger Diaspora, One Family at a Time
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Since our founding, the Tanzania Sharing Association has been a lifeline for
              Tanzanian families across Texas. We have supported dozens of families through
              difficult times and celebrated countless milestones together.
            </p>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-2 gap-8">
              <div>
                <p className="text-4xl font-bold text-foreground">$50K+</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Distributed in mutual aid
                </p>
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground">25+</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Families supported
                </p>
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground">15+</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Community events per year
                </p>
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground">5+</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Texas cities represented
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
