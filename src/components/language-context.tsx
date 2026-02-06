"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

type Language = "en" | "sw"

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>("en")

    useEffect(() => {
        const savedLang = localStorage.getItem("language") as Language
        if (savedLang && (savedLang === "en" || savedLang === "sw")) {
            setLanguage(savedLang)
        }
    }, [])

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang)
        localStorage.setItem("language", lang)
    }

    const toggleLanguage = () => {
        handleSetLanguage(language === "en" ? "sw" : "en")
    }

    return (
        <LanguageContext.Provider
            value={{ language, setLanguage: handleSetLanguage, toggleLanguage }}
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
