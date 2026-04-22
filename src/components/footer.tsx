"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Mail, Phone, MapPin, DollarSign, Smartphone, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/components/language-context"
import { submitContactMessage } from "@/features/contact/actions"
import { translations } from "@/lib/translations"

export function Footer() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { language } = useLanguage()
  const { toast } = useToast()
  const t = translations[language].footer

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      const result = await submitContactMessage(formData)

      if (result.success) {
        setSubmitted(true)
        toast({
          title: language === "en" ? "Message Sent" : "Ujumbe Umetumwa",
          description: t.contact.successText,
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: language === "en" ? "Error" : "Hitilafu",
        description: language === "en" ? "Failed to send message. Please try again later." : "Imeshindikana kutuma ujumbe. Tafadhali jaribu tena baadaye.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

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
                  alt="TSA Logo"
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-serif text-lg font-bold leading-none text-background">
                  {translations[language].common.orgFullName}
                </h3>
              </div>
            </div>

            <p className="max-w-md text-sm leading-relaxed text-background/80">
              {t.description}
            </p>

            <div className="flex flex-col gap-6 text-xs text-background/80">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-background">{t.location.title}</p>
                  <p className="mt-1 text-background/70 leading-relaxed">
                    {t.location.text}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-background">{t.email.title}</p>
                  <p className="mt-1 text-background/70">
                    <a href="mailto:tansha.hq@gmail.com" className="hover:text-primary transition-colors">
                      tansha.hq@gmail.com
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/20 text-secondary">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-background">{t.phone.title}</p>
                  <p className="mt-1 text-background/70">(469) 555-0192</p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Contributions */}
          <div className="flex flex-col gap-5">
            <h3 className="font-semibold text-lg text-primary">
              {t.contributions.title}
            </h3>

            <div className="flex flex-col gap-3">
              {/* Zelle Card */}
              <div className="rounded-xl border border-background/10 bg-background/5 p-3 transition-colors hover:border-primary/50 hover:bg-background/10">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/10 text-primary">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-background">{t.contributions.zelle}</p>
                    <p className="mt-1 text-xs text-background/70 font-mono">
                      treasurer@tansha.org
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
                    <p className="font-bold text-sm text-background">{t.contributions.cashapp}</p>
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
              {t.contact.title}
            </h3>

            <div className="rounded-2xl border border-background/10 bg-background/5 p-4">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <Mail className="h-7 w-7" />
                  </div>
                  <h4 className="mt-4 text-lg font-bold text-background">{t.contact.success}</h4>
                  <p className="mt-2 text-sm text-background/70">
                    {t.contact.successText}
                  </p>
                  <Button
                    variant="link"
                    onClick={() => setSubmitted(false)}
                    className="mt-4 text-primary hover:text-primary/80"
                  >
                    {t.contact.anotherMessage}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-xs text-background/70">
                        {t.contact.firstName}
                      </Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        required
                        className="h-8 border-background/20 bg-background/10 text-xs text-background placeholder:text-background/30 focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-xs text-background/70">
                        {t.contact.lastName}
                      </Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        required
                        className="h-8 border-background/20 bg-background/10 text-xs text-background placeholder:text-background/30 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs text-background/70">{t.contact.email}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="h-8 border-background/20 bg-background/10 text-xs text-background placeholder:text-background/30 focus-visible:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="message" className="text-xs text-background/70">{t.contact.message}</Label>
                    <Textarea
                      id="message"
                      name="message"
                      rows={3}
                      required
                      className="resize-none border-background/20 bg-background/10 text-xs text-background placeholder:text-background/30 focus-visible:ring-primary"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {language === "en" ? "Sending..." : "Inatuma..."}
                      </>
                    ) : (
                      t.contact.submit
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-background/10 pt-8 sm:flex-row">
          <p className="text-xs text-background/60">
            &copy; {new Date().getFullYear()} {t.copyright} • 
            <a 
              href="https://github.com/yakubmungai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-1 text-background/40 hover:text-primary transition-colors"
            >
              Developed by Jacob Mungai
            </a>
          </p>
          <div className="flex gap-6 text-xs text-background/60">
            <a href="#" onClick={(e) => handleComingSoon(e, t.privacy)} className="hover:text-primary transition-colors">{t.privacy}</a>
            <a href="/constitution" className="hover:text-primary transition-colors">{t.constitution}</a>
            <a href="#" onClick={(e) => handleComingSoon(e, t.bylaws)} className="hover:text-primary transition-colors">{t.bylaws}</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

