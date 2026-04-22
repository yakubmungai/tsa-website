"use client"

import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Menu, X, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-context"

import { translations } from "@/lib/translations"

const navLinks = (t: any) => [
  { label: t.about, href: "/#about" },
  { label: t.programs, href: "/#programs" },
  { label: t.events, href: "/events" },
  { label: t.forms, href: "/forms" },
  { label: t.contact, href: "/#contact" },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { language, toggleLanguage } = useLanguage()
  const pathname = usePathname()
  const t = translations[language].nav

  // Shrink navbar on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault()
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    }
  }

  const headerClass = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-card/90 backdrop-blur-md border-b border-border ${scrolled ? "py-1 shadow-md" : "py-2"}`

  const navLinkClass = "text-sm font-medium transition-colors text-muted-foreground hover:text-foreground relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full"

  const logoTextClass = "text-lg font-semibold tracking-tight transition-colors text-foreground"

  const languageBtnClass = "flex items-center gap-2 transition-colors text-muted-foreground hover:bg-transparent hover:text-foreground"

  const menuBtnClass = "flex items-center justify-center rounded-md p-2 md:hidden text-foreground"

  return (
    <header className={headerClass}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-3" onClick={handleLogoClick} aria-label="Tanzania Sharing Association Home">
          <img
            src="/images/tsa-logo.png"
            alt="TSA Logo"
            className={`rounded-full object-cover transition-all duration-300 ${scrolled ? "h-10 w-10" : "h-14 w-14"}`}
          />
          <span className={logoTextClass}>
            {translations[language].common.orgFullName}
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks(t).map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={navLinkClass}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className={languageBtnClass}
            aria-label={`Switch to ${language === "en" ? "SW" : "EN"}`}
          >
            <Globe className="h-4 w-4" />
            <span className="uppercase text-xs font-bold">{t.switchTo}</span>
          </Button>
          <Button asChild className="btn-shimmer text-primary-foreground border-0">
            <a href="/#membership">{t.joinUs}</a>
          </Button>
        </div>

        <button
          type="button"
          className={menuBtnClass}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-card px-6 pb-6 pt-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {navLinks(t).map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="justify-start gap-2 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
              aria-label={`Switch to ${language === "en" ? "SW" : "EN"}`}
            >
              <Globe className="h-4 w-4" />
              <span className="uppercase text-xs font-bold">{t.switchTo}</span>
            </Button>
            <Button asChild className="mt-2 w-full btn-shimmer text-primary-foreground border-0">
              <a href="/#membership" onClick={() => setMobileOpen(false)}>
                {t.joinUs}
              </a>
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}

