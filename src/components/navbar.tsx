"use client"

import { usePathname } from "next/navigation"

import { useState } from "react"
import { Menu, X, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-context"

const navLinks = [
  { label: "About", href: "/#about" },
  { label: "Programs", href: "/#programs" },
  { label: "Events", href: "/events" },
  { label: "Contact", href: "/#contact" },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { language, toggleLanguage } = useLanguage()
  const pathname = usePathname()

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault()
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    }
  }

  const headerClass = "fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-card/90 backdrop-blur-md border-b border-border py-2"

  const navLinkClass = "text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"

  const logoTextClass = "text-lg font-semibold tracking-tight transition-colors text-foreground"

  const languageBtnClass = "flex items-center gap-2 transition-colors text-muted-foreground hover:bg-transparent hover:text-foreground"

  const menuBtnClass = "flex items-center justify-center rounded-md p-2 md:hidden text-foreground"

  return (
    <header className={headerClass}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-3" onClick={handleLogoClick}>
          <img
            src="/images/tsa-logo.png"
            alt="Tanzania Sharing Association Logo"
            className="h-14 w-14 rounded-full object-cover transition-all duration-300"
          />
          <span className={logoTextClass}>
            Tanzania Sharing Association
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
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
          >
            <Globe className="h-4 w-4" />
            <span className="uppercase">{language}</span>
          </Button>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <a href="/#membership">Become a Member</a>
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
            {navLinks.map((link) => (
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
            >
              <Globe className="h-4 w-4" />
              <span className="uppercase">Switch to {language === "en" ? "Swahili" : "English"}</span>
            </Button>
            <Button asChild className="mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <a href="/#membership" onClick={() => setMobileOpen(false)}>
                Become a Member
              </a>
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
