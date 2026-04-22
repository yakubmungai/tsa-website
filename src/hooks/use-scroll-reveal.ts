"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Custom hook that triggers a CSS animation when an element scrolls into view.
 * Uses IntersectionObserver for performance.
 */
export function useScrollReveal(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                    observer.unobserve(el) // only animate once
                }
            },
            { threshold }
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [threshold])

    return { ref, isVisible }
}
