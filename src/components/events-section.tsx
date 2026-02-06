import { Calendar, MapPin, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

const events = [
  {
    date: "Mar 15, 2026",
    day: "15",
    month: "MAR",
    title: "Annual General Meeting",
    location: "Dallas Community Center, TX",
    time: "2:00 PM - 5:00 PM",
    description:
      "Join us for our annual meeting to review the year's activities, elect new officers, and plan for the future.",
  },
  {
    date: "Apr 26, 2026",
    day: "26",
    month: "APR",
    title: "Tanzanian Independence Celebration",
    location: "Riverside Park, Houston, TX",
    time: "11:00 AM - 6:00 PM",
    description:
      "Celebrate Tanzania's Union Day with traditional food, music, dance performances, and cultural exhibitions.",
  },
  {
    date: "Jun 20, 2026",
    day: "20",
    month: "JUN",
    title: "Community Cookout & Fundraiser",
    location: "Oak Grove Park, Austin, TX",
    time: "12:00 PM - 5:00 PM",
    description:
      "A family-friendly gathering featuring Tanzanian cuisine, games for children, and a fundraiser for the education fund.",
  },
]

export function EventsSection() {
  return (
    <section id="events" className="bg-muted py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Upcoming Events
            </p>
            <h2 className="mt-3 text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
              Come Together With Us
            </h2>
          </div>
          <Button
            asChild
            variant="outline"
            className="border-border text-foreground hover:bg-card bg-transparent"
          >
            <a href="#contact">View All Events</a>
          </Button>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {events.map((event) => (
            <article
              key={event.title}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg"
            >
              {/* Date header */}
              <div className="flex items-center gap-4 border-b border-border bg-primary/5 px-6 py-4">
                <div className="text-center">
                  <p className="text-2xl font-bold leading-none text-primary">
                    {event.day}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-primary/70">
                    {event.month}
                  </p>
                </div>
                <div className="h-10 w-px bg-border" />
                <h3 className="text-base font-semibold text-foreground">
                  {event.title}
                </h3>
              </div>

              {/* Event details */}
              <div className="p-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {event.description}
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-secondary" />
                    {event.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 text-secondary" />
                    {event.time}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 text-secondary" />
                    {event.date}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
