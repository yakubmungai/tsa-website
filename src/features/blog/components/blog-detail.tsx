"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/components/language-context"
import { translations } from "@/lib/translations"
import { BlogPost } from "../types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, ArrowLeft, User, Share2, X } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface BlogDetailProps {
  post: BlogPost
}

export function BlogDetail({ post }: BlogDetailProps) {
  const { language } = useLanguage()
  const t = translations[language].blog
  const [scrollProgress, setScrollProgress] = useState(0)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Calculate scroll progress for the reading indicator
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight
      if (totalScroll > 0) {
        const currentProgress = (window.scrollY / totalScroll) * 100
        setScrollProgress(currentProgress)
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(language === "en" ? "en-US" : "sw-TZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title[language],
        text: post.excerpt[language],
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          toast.success(language === "en" ? "Link copied to clipboard!" : "Kiungo kimenakiliwa kwenye ubao wa kunakili!")
        })
        .catch(() => {
          toast.error(language === "en" ? "Failed to copy link" : "Imeshindikana kunakili kiungo")
        })
    }
  }

  const localizedTitle = post.title[language]
  const localizedCategory = post.category[language]
  const localizedReadTime = post.readTime[language]
  const contentBlocks = post.content[language]

  return (
    <article className="relative min-h-screen bg-background pb-24 overflow-hidden">
      {/* Scroll Progress Bar */}
      <div 
        className="fixed top-[60px] md:top-[72px] left-0 h-[3px] bg-primary z-50 transition-all duration-100 ease-out" 
        style={{ width: `${scrollProgress}%` }}
        aria-hidden="true"
      />

      {/* Decorative background blurs */}
      <div className="absolute top-20 right-1/4 w-[350px] h-[350px] rounded-full bg-primary/5 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-40 left-1/4 w-[350px] h-[350px] rounded-full bg-secondary/5 blur-[90px] pointer-events-none" />

      {/* Top Banner Content Area */}
      <div className="bg-muted/30 border-b border-border/40 pt-24 sm:pt-28 md:pt-32 pb-8 md:pb-10">
        <div className="mx-auto max-w-3xl px-6">
          {/* Back Button */}
          <Button 
            asChild 
            variant="ghost" 
            size="sm" 
            className="mb-4 pl-2 text-muted-foreground hover:text-foreground hover:bg-transparent -ml-2"
          >
            <Link href="/blog" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>{t.backToBlog}</span>
            </Link>
          </Button>

          {/* Categories and Badges */}
          <div className="flex items-center gap-3 mb-3">
            <Badge className="bg-primary/95 text-primary-foreground font-semibold border-0">
              {localizedCategory}
            </Badge>
            <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
              TSA Editorial
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-4 animate-fade-in-up">
            {localizedTitle}
          </h1>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {post.author}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(post.publishedAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                <Clock className="h-3.5 w-3.5" />
                {localizedReadTime}
              </span>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 rounded-full border-border/60 hover:bg-muted"
                onClick={handleShare}
                aria-label="Share article"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-12 md:pt-10 md:pb-16">
        {post.coverImage && (
          <div className="relative overflow-hidden rounded-2xl border border-border/40 aspect-[16/9] mb-12 shadow-md">
            <img 
              src={post.coverImage} 
              alt={localizedTitle} 
              className="w-full h-full object-cover animate-fade-in-up"
            />
          </div>
        )}

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          {contentBlocks.map((block, idx) => {
            switch (block.type) {
              case "paragraph":
                return (
                  <p 
                    key={idx} 
                    className="text-base sm:text-lg leading-relaxed text-foreground/90 dark:text-foreground/90 mb-6"
                  >
                    {block.value as string}
                  </p>
                )
              case "heading":
                return (
                  <h2 
                    key={idx} 
                    className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-12 mb-6"
                  >
                    {block.value as string}
                  </h2>
                )
              case "quote":
                return (
                  <blockquote 
                    key={idx} 
                    className="border-l-4 border-primary bg-primary/5 rounded-r-xl p-6 md:p-8 my-10 font-medium italic text-foreground/90 leading-relaxed shadow-sm"
                  >
                    {block.value as string}
                  </blockquote>
                )
              case "list":
                return (
                  <ul 
                    key={idx} 
                    className="list-disc pl-6 space-y-4 my-8 text-foreground/90 dark:text-foreground/90"
                  >
                    {(block.value as string[]).map((item, itemIdx) => (
                      <li 
                        key={itemIdx} 
                        className="text-base sm:text-lg leading-relaxed"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )
              case "image":
                return (
                  <div 
                    key={idx} 
                    className="my-10 group relative cursor-pointer overflow-hidden rounded-2xl border border-border/40 shadow-md transition-all duration-300 hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 max-w-2xl mx-auto"
                    onClick={() => setSelectedImage(block.value as string)}
                  >
                    <img 
                      src={block.value as string} 
                      alt="Graduation Announcement" 
                      className="w-full h-auto rounded-2xl" 
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="text-white font-semibold bg-primary/95 px-4 py-2 rounded-full text-xs shadow-md tracking-wide backdrop-blur-sm">
                        {language === "en" ? "View Image" : "Tazama Picha"}
                      </span>
                    </div>
                  </div>
                )
              case "gallery": {
                const images = block.value as string[]
                let gridColsClass = "grid-cols-1"
                if (images.length === 2) {
                  gridColsClass = "grid-cols-1 sm:grid-cols-2"
                } else if (images.length >= 3) {
                  gridColsClass = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                }
                return (
                  <div key={idx} className="my-10">
                    <div className={`grid ${gridColsClass} gap-6`}>
                      {images.map((imgUrl, imgIdx) => (
                        <div 
                          key={imgIdx} 
                          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/40 shadow-md transition-all duration-300 hover:shadow-xl hover:border-primary/40 hover:-translate-y-1"
                          onClick={() => setSelectedImage(imgUrl)}
                        >
                          <img 
                            src={imgUrl} 
                            alt={`Graduation announcement ${imgIdx + 1}`} 
                            className="w-full h-auto object-cover rounded-2xl" 
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <span className="text-white font-semibold bg-primary/95 px-4 py-2 rounded-full text-xs shadow-md tracking-wide backdrop-blur-sm">
                              {language === "en" ? "View Image" : "Tazama Picha"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
              default:
                return null
            }
          })}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 transition-all duration-300 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/75 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm transition-colors duration-200 z-[101]"
            onClick={() => setSelectedImage(null)}
            aria-label="Close image viewer"
          >
            <X className="h-6 w-6" />
          </button>
          <div 
            className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={selectedImage} 
              alt="Graduation Announcement Zoomed" 
              className="w-full h-auto max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </article>
  )
}
