import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { AboutSection } from "@/components/about-section"
import { ProgramsSection } from "@/components/programs-section"
import { ImpactSection } from "@/components/impact-section"

import { MembershipSection } from "@/components/membership-section"

import { Footer } from "@/components/footer"

export default function Page() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <ProgramsSection />
        <ImpactSection />

        <MembershipSection />
      </main>
      <Footer />
    </>
  )
}
