import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

const benefits = [
  "Access to the mutual-aid emergency fund",
  "Bereavement and medical support coverage",
  "Invitation to all community events and celebrations",
  "Voting rights in association elections",
  "Scholarship eligibility for member families",
  "Connection to the broader Tanzanian-American network",
]

export function MembershipSection() {
  return (
    <section id="membership" className="py-24 md:py-32 bg-muted">
      <div className="mx-auto max-w-7xl px-6">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="grid lg:grid-cols-2">
            {/* Image side */}
            <div className="relative min-h-[300px] lg:min-h-0">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2000&auto=format&fit=crop"
                alt="Diverse group of friends smiling and embracing"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-primary/30" />
            </div>

            {/* Content side */}
            <div className="p-8 md:p-12 lg:p-16">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                Membership
              </p>
              <h2 className="mt-3 text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl">
                Become Part of Something Greater
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Membership in the Tanzania Sharing Association is open to all individuals of
                Tanzanian heritage living in Texas and surrounding states. Together, we build
                a safety net that protects and uplifts every family.
              </p>

              <ul className="mt-8 flex flex-col gap-3">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
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
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <a href="#contact">Apply for Membership</a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted bg-transparent"
                >
                  <a href="#contact">Ask a Question</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
