import { Heart, Users, Globe, Shield } from "lucide-react"

const values = [
  {
    icon: Heart,
    title: "Mutual Aid",
    description:
      "We believe in lifting each other up. Our members contribute to a shared fund that supports families through life's challenges and celebrations.",
  },
  {
    icon: Users,
    title: "Community",
    description:
      "We foster a strong sense of belonging among Tanzanians in Texas, creating spaces where our culture thrives and our bonds deepen.",
  },
  {
    icon: Globe,
    title: "Cultural Heritage",
    description:
      "We preserve and celebrate Tanzanian traditions, language, and customs, ensuring our children carry forward the richness of our heritage.",
  },
  {
    icon: Shield,
    title: "Support & Advocacy",
    description:
      "We stand together during times of need, offering practical support, guidance, and a network of care for every member.",
  },
]

export function AboutSection() {
  return (
    <section id="about" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Who We Are
          </p>
          <h2 className="mt-3 text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            Rooted in Tanzanian Values, Growing in Texas
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Founded by Tanzanian immigrants in the heart of Texas, the Tanzania Sharing
            Association (TSA) is a registered nonprofit mutual-aid society dedicated to
            strengthening the bonds within our diaspora community. We provide a safety net of
            support, cultural enrichment, and shared prosperity.
          </p>
        </div>

        {/* Values grid */}
        <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value) => (
            <div
              key={value.title}
              className="group rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
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
