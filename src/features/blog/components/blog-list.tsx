"use client"

import { useLanguage } from "@/components/language-context"
import { translations } from "@/lib/translations"
import { blogPosts } from "../utils/posts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react"
import Link from "next/link"

export function BlogList() {
  const { language } = useLanguage()
  const t = translations[language].blog

  // Format date nicely based on language
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(language === "en" ? "en-US" : "sw-TZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <section className="relative pt-12 pb-32 md:pt-16 md:pb-44 min-h-[85vh] bg-muted/20 overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-20 left-1/4 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 translate-x-1/2 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 w-full">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary animate-fade-in-up">
            {t.badge}
          </p>
          <h1 className="mt-3 text-balance font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl animate-fade-in-up delay-100">
            {t.title}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground animate-fade-in-up delay-200">
            {t.subtitle}
          </p>
        </div>

        {/* Blog Post Grid */}
        {blogPosts.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border/50 animate-fade-in-up delay-300">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg text-muted-foreground font-medium">{t.noPosts}</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col gap-12">
            {/* Featured Post Card */}
            {blogPosts[0] && (
              <Link href={`/blog/${blogPosts[0].slug}`} className="group block">
                <Card className="overflow-hidden border border-border/40 bg-card/85 backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:border-primary/50 hover:-translate-y-1.5 rounded-2xl shadow-md flex flex-col lg:flex-row animate-fade-in-up delay-200">
                  {/* Image Container */}
                  <div className="relative aspect-[16/9] lg:aspect-auto lg:w-[40%] overflow-hidden bg-muted">
                    {blogPosts[0].coverImage ? (
                      <img
                        src={blogPosts[0].coverImage}
                        alt={blogPosts[0].title[language]}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-emerald-700/10 to-secondary/20 transition-transform duration-500 group-hover:scale-103" />
                    )}
                    {/* Localized Category Badge */}
                    <div className="absolute top-4 left-4 z-10">
                      <Badge className="bg-primary/95 text-primary-foreground font-semibold px-2.5 py-0.5 text-xs border-0 shadow-sm">
                        {blogPosts[0].category[language]}
                      </Badge>
                    </div>
                  </div>

                  {/* Content Container */}
                  <div className="p-6 md:p-8 lg:w-[60%] flex flex-col justify-between">
                    <div>
                      {/* Meta info */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(blogPosts[0].publishedAt)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {blogPosts[0].readTime[language]}
                        </span>
                      </div>

                      {/* Title */}
                      <CardTitle className="font-serif text-xl md:text-2xl font-bold text-foreground leading-snug group-hover:text-primary transition-colors duration-300 mb-3">
                        {blogPosts[0].title[language]}
                      </CardTitle>

                      {/* Excerpt */}
                      <CardDescription className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
                        {blogPosts[0].excerpt[language]}
                      </CardDescription>
                    </div>

                    {/* CTA Footer */}
                    <div className="flex items-center text-primary font-semibold text-sm pt-4 border-t border-border/30">
                      <span>{t.readMore}</span>
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1.5 duration-300" />
                    </div>
                  </div>
                </Card>
              </Link>
            )}

            {/* Remaining Posts Grid */}
            {blogPosts.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
                {blogPosts.slice(1).map((post) => {
                  const localizedTitle = post.title[language]
                  const localizedExcerpt = post.excerpt[language]
                  const localizedCategory = post.category[language]
                  const localizedReadTime = post.readTime[language]

                  return (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="group h-full block">
                      <Card className="h-full flex flex-col overflow-hidden border border-border/40 bg-card/85 backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:border-primary/50 hover:-translate-y-1.5 rounded-2xl shadow-md">
                        {/* Cover Image */}
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                          {post.coverImage ? (
                            <img
                              src={post.coverImage}
                              alt={localizedTitle}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-emerald-700/10 to-secondary/20 transition-transform duration-500 group-hover:scale-103" />
                          )}
                          <div className="absolute top-4 left-4 z-10">
                            <Badge className="bg-primary/95 text-primary-foreground font-semibold px-3 py-1 border-0 shadow-sm">
                              {localizedCategory}
                            </Badge>
                          </div>
                        </div>

                        <CardHeader className="p-6 pb-2">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(post.publishedAt)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {localizedReadTime}
                            </span>
                          </div>
                          <CardTitle className="font-serif text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors duration-300">
                            {localizedTitle}
                          </CardTitle>
                        </CardHeader>

                        <CardContent className="p-6 pt-2 flex-grow flex flex-col justify-between">
                          <CardDescription className="text-muted-foreground text-sm leading-relaxed mb-6 line-clamp-3">
                            {localizedExcerpt}
                          </CardDescription>
                          <div className="flex items-center text-primary font-semibold text-sm mt-auto pt-4 border-t border-border/30">
                            <span>{t.readMore}</span>
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1.5 duration-300" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
