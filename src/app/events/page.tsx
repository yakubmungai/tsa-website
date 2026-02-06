import { Navbar } from "@/components/navbar"
import { EventsSection } from "@/components/events-section"
import { Footer } from "@/components/footer"

export default function EventsPage() {
    return (
        <>
            <Navbar />
            <main className="pt-20">
                <EventsSection />
            </main>
            <Footer />
        </>
    )
}
