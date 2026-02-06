import { HandHeart, GraduationCap, Stethoscope, PartyPopper, Landmark, Handshake } from "lucide-react"

const programs = [
  {
    icon: HandHeart,
    title: "Bereavement Support",
    description:
      "Financial and emotional support for families dealing with loss, including assistance with funeral arrangements and repatriation.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: GraduationCap,
    title: "Education Fund",
    description:
      "Scholarships and educational support for the children of our members, investing in the next generation of Tanzanian-American leaders.",
    color: "bg-secondary/10 text-secondary",
  },
  {
    icon: Stethoscope,
    title: "Health & Wellness",
    description:
      "Support during medical emergencies and health education initiatives to keep our community healthy and informed.",
    color: "bg-accent/20 text-accent-foreground",
  },
  {
    icon: PartyPopper,
    title: "Cultural Celebrations",
    description:
      "Annual events celebrating Tanzanian independence, cultural festivals, and community gatherings that honor our heritage.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Landmark,
    title: "Civic Engagement",
    description:
      "Empowering our members to participate in American civic life while maintaining strong ties to Tanzania.",
    color: "bg-secondary/10 text-secondary",
  },
  {
    icon: Handshake,
    title: "New Arrivals Support",
    description:
      "Welcoming and assisting newly arrived Tanzanians with settlement, orientation, and integration into the community.",
    color: "bg-accent/20 text-accent-foreground",
  },
]

export function ProgramsSection() {
  return (
    <section id="programs" className="bg-muted py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Our Programs
          </p>
          <h2 className="mt-3 text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            How We Support Each Other
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Through structured programs and collective resources, we ensure no member
            of our community faces hardship alone.
          </p>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <div
              key={program.title}
              className="flex gap-5 rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-md"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${program.color}`}
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
