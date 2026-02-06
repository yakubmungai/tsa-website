"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Mail, Phone, MapPin, DollarSign, Smartphone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function Footer() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)
  }

  const { toast } = useToast()

  const handleComingSoon = (e: React.MouseEvent<HTMLAnchorElement>, feature: string) => {
    e.preventDefault()
    toast({
      title: "Coming Soon",
      description: `We're working hard to bring you the ${feature}. Please check back later!`,
    })
  }

  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-3 lg:gap-8">
          {/* Column 1: Brand & Info */}
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/20 p-1">
                <img
                  src="/images/tsa-logo-white.png"
                  alt="Tanzania Sharing Association Logo"
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-serif text-lg font-bold leading-none text-background">
                  Tanzania Sharing Association
                </h3>
              </div>
            </div>

            <p className="max-w-md text-sm leading-relaxed text-background/80">
              Empowering Tanzanians in the diaspora through solidarity, mutual
              aid, and cultural preservation. Together, we are stronger.
            </p>

            <div className="flex flex-col gap-6 text-xs text-background/80">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-background">Location</p>
                  <p className="mt-1 text-background/70 leading-relaxed">
                    Serving the greater Dallas-Fort Worth, Houston,
                    <br />
                    Austin, and San Antonio areas
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-background">Email</p>
                  <p className="mt-1 text-background/70">info@tsatexas.org</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/20 text-secondary">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-background">Phone</p>
                  <p className="mt-1 text-background/70">(469) 555-0192</p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Contributions */}
          <div className="flex flex-col gap-5">
            <h3 className="font-semibold text-lg text-primary">
              Send Contributions
            </h3>

            <div className="flex flex-col gap-3">
              {/* Zelle Card */}
              <div className="rounded-xl border border-background/10 bg-background/5 p-3 transition-colors hover:border-primary/50 hover:bg-background/10">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/10 text-primary">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-background">Zelle</p>
                    <p className="mt-1 text-xs text-background/70 font-mono">
                      treasurer@tsatexas.org
                    </p>
                  </div>
                </div>
              </div>

              {/* CashApp Card */}
              <div className="rounded-xl border border-background/10 bg-background/5 p-3 transition-colors hover:border-primary/50 hover:bg-background/10">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/10 text-primary">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-background">CashApp</p>
                    <p className="mt-1 text-xs text-background/70 font-mono">
                      $TSATexas
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Contact Form */}
          <div className="flex flex-col gap-5">
            <h3 className="font-semibold text-lg text-primary">
              Contact Us
            </h3>

            <div className="rounded-2xl border border-background/10 bg-background/5 p-4">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <Mail className="h-7 w-7" />
                  </div>
                  <h4 className="mt-4 text-lg font-bold text-background">Message Sent!</h4>
                  <p className="mt-2 text-sm text-background/70">
                    We'll get back to you shortly.
                  </p>
                  <Button
                    variant="link"
                    onClick={() => setSubmitted(false)}
                    className="mt-4 text-primary hover:text-primary/80"
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-xs text-background/70">First Name</Label>
                      <Input
                        id="firstName"
                        required
                        className="h-8 border-background/20 bg-background/10 text-xs text-background placeholder:text-background/30 focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-xs text-background/70">Last Name</Label>
                      <Input
                        id="lastName"
                        required
                        className="h-8 border-background/20 bg-background/10 text-xs text-background placeholder:text-background/30 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs text-background/70">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      className="h-8 border-background/20 bg-background/10 text-xs text-background placeholder:text-background/30 focus-visible:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="message" className="text-xs text-background/70">Message</Label>
                    <Textarea
                      id="message"
                      rows={3}
                      required
                      className="resize-none border-background/20 bg-background/10 text-xs text-background placeholder:text-background/30 focus-visible:ring-primary"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Send Message
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-background/10 pt-8 sm:flex-row">
          <p className="text-xs text-background/60">
            &copy; {new Date().getFullYear()} Tanzania Sharing Association. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-background/60">
            <a href="#" onClick={(e) => handleComingSoon(e, "Privacy Policy")} className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" onClick={(e) => handleComingSoon(e, "Constitution")} className="hover:text-primary transition-colors">Constitution</a>
            <a href="#" onClick={(e) => handleComingSoon(e, "Bylaws")} className="hover:text-primary transition-colors">Bylaws</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
