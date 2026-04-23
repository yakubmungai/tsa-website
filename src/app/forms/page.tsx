"use client";

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FileText, ClipboardList, ArrowRight, Heart } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/language-context";
import { translations } from "@/lib/translations"

export default function FormsSelectionPage() {
  const { language } = useLanguage();
  const t = translations[language].formsSelection;

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center pt-20 pb-10 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl flex flex-col items-center">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-serif font-bold text-foreground sm:text-4xl">{t.title}</h1>
            <p className="mt-2 text-muted-foreground text-base max-w-lg mx-auto">
              {t.description}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl">
            {/* Membership Form Square */}
            <Link href="/membership" className="h-full">
              <Card className="h-full cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-2 hover:border-primary group flex flex-col">
                <CardHeader className="text-center pt-8 pb-4">
                  <div className="mx-auto h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <ClipboardList className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-bold">{t.membership.title}</CardTitle>
                  <CardDescription className="text-sm mt-1 px-4">
                    {t.membership.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-8 mt-auto">
                  <div className="flex items-center text-primary font-semibold text-sm">
                    {t.membership.cta}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Constitution Agreement Square */}
            <Link href="/constitution" className="h-full">
              <Card className="h-full cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-2 hover:border-secondary group flex flex-col">
                <CardHeader className="text-center pt-8 pb-4">
                  <div className="mx-auto h-16 w-16 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                    <FileText className="h-8 w-8 text-secondary" />
                  </div>
                  <CardTitle className="text-xl font-bold">{t.constitution.title}</CardTitle>
                  <CardDescription className="text-sm mt-1 px-4">
                    {t.constitution.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-8 mt-auto">
                  <div className="flex items-center text-secondary font-semibold text-sm">
                    {t.constitution.cta}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Funeral Notice Square */}
            <Link href="/funeral-notice" className="h-full">
              <Card className="h-full cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-2 hover:border-slate-800 group flex flex-col">
                <CardHeader className="text-center pt-8 pb-4">
                  <div className="mx-auto h-16 w-16 rounded-xl bg-slate-800/10 flex items-center justify-center mb-4 group-hover:bg-slate-800/20 transition-colors">
                    <Heart className="h-8 w-8 text-slate-800" />
                  </div>
                  <CardTitle className="text-xl font-bold">{t.funeralNotice.title}</CardTitle>
                  <CardDescription className="text-sm mt-1 px-4">
                    {t.funeralNotice.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-8 mt-auto">
                  <div className="flex items-center text-slate-800 font-semibold text-sm">
                    {t.funeralNotice.cta}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="mt-12 text-center p-4 rounded-xl bg-primary/5 border border-primary/10 max-w-md">
            <h3 className="text-base font-semibold text-primary">{t.help.title}</h3>
            <p className="text-muted-foreground text-xs mt-0.5">
              {t.help.email} <span className="font-medium text-foreground">tansha.hq@gmail.com</span>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

