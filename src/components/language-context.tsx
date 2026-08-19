"use client"

import React, { createContext, useContext, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setLocale } from "@/features/i18n/actions"

type Language = "en" | "sw"

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    toggleLanguage: () => void
    /** True while the server re-renders in the new language. */
    isSwitching: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

/**
 * The language is resolved on the server and handed down as `initialLanguage`,
 * so the first paint is already correct.
 *
 * The previous version defaulted to English and corrected itself in an effect,
 * which made every page flash English on load — and meant Server Components
 * could not see the language at all.
 */
export function LanguageProvider({
    children,
    initialLanguage,
}: {
    children: React.ReactNode
    initialLanguage: Language
}) {
    const router = useRouter()
    const [language, setLanguageState] = useState<Language>(initialLanguage)
    const [isSwitching, startTransition] = useTransition()

    const handleSetLanguage = (lang: Language) => {
        // Update immediately so client components respond at once, then persist
        // and refresh so server-rendered content follows.
        setLanguageState(lang)
        startTransition(async () => {
            await setLocale(lang)
            router.refresh()
        })
    }

    const toggleLanguage = () => {
        handleSetLanguage(language === "en" ? "sw" : "en")
    }

    return (
        <LanguageContext.Provider
            value={{ language, setLanguage: handleSetLanguage, toggleLanguage, isSwitching }}
        >
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider")
    }
    return context
}
