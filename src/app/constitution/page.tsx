'use client';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { submitConstitution } from '@/features/membership/actions';
import { useLanguage } from '@/components/language-context';
import { ShieldCheck, FileText, UserCheck } from 'lucide-react';

const translations = {
  en: {
    header: "TANZANIA SHARING ASSOCIATION (TSA)",
    title: "Constitution Agreement",
    firstName: "First Name",
    lastName: "Last Name",
    streetAddress: "Street Address",
    city: "City",
    state: "State",
    zipCode: "Zip Code",
    email: "Email Address",
    phone: "Phone Number",
    agreement1: "I have read and understood the TSA Constitution.",
    agreement2: "I agree to all terms and promise to obey all TSA laws and regulations.",
    signature: "Digital Signature (Full Name)",
    date: "Date",
    submit: "Sign Agreement",
    submitting: "Signing Agreement...",
    idSection: "Identification",
    declarationSection: "Declaration",
    signingSection: "Signature",
    placeholder: "Type here",
    viewDocument: "Read TSA Constitution (2025-2030)",
    documentDescription: "Please review the official TSA Constitution document below before signing your agreement.",
  },
  sw: {
    header: "TANZANIA SHARING ASSOCIATION (TSA)",
    title: "Makubaliano ya Katiba ya TSA",
    firstName: "Jina la Kwanza",
    lastName: "Jina la Ukoo",
    streetAddress: "Anuani ya Mtaa",
    city: "Mji",
    state: "Jimbo",
    zipCode: "Zip Code",
    email: "Barua Pepe",
    phone: "Namba ya Simu",
    agreement1: "Nimeisoma na kuielewa Katiba ya TSA.",
    agreement2: "Nakubali masharti yote na naahidi kuitii Katiba na sheria na taratibu zote za TSA.",
    signature: "Sahihi ya Kidijitali (Jina Kamili)",
    date: "Tarehe",
    submit: "Weka Sahihi",
    submitting: "Inasaini Makubaliano...",
    idSection: "Utambulisho",
    declarationSection: "Tamko",
    signingSection: "Sahihi",
    placeholder: "Andika hapa",
    viewDocument: "Soma Katiba ya TSA (2025-2030)",
    documentDescription: "Tafadhali kagua hati rasmi ya Katiba ya TSA hapa chini kabla ya kusaini makubaliano yako.",
  }
};

const formSchema = z.object({
  firstName: z.string().min(2, "Required"),
  lastName: z.string().min(2, "Required"),
  streetAddress: z.string().min(5, "Required"),
  city: z.string().min(2, "Required"),
  state: z.string().min(2, "Required"),
  zipCode: z.string().min(5, "Required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Required"),
  agreement1: z.boolean().refine(v => v === true, "Required"),
  agreement2: z.boolean().refine(v => v === true, "Required"),
  signature: z.string().min(5, "Full name required for signature"),
  agreementDate: z.string().min(1, "Date required"),
});

export default function ConstitutionPage() {
  const { language: lang } = useLanguage();
  const t = translations[lang];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      streetAddress: "",
      city: "",
      state: "",
      zipCode: "",
      email: "",
      phone: "",
      agreement1: false,
      agreement2: false,
      signature: "",
      agreementDate: new Date().toISOString().split('T')[0],
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const result = await submitConstitution(values);

      if (!result.success) throw new Error(result.error);

      toast.success(lang === 'en' ? "Agreement signed successfully!" : "Makubaliano yamesainiwa kwa mafanikio!");
      form.reset();
    } catch (error) {
      toast.error(lang === 'en' ? "Failed to submit." : "Imeshindikana kutuma.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-muted/30 pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-2xl">

          <Card className="border border-border/50 shadow-2xl shadow-primary/5 bg-card overflow-hidden">
            <div className="h-2 bg-secondary w-full" />
            <CardHeader className="pt-10 pb-6 text-center border-b border-border/30 bg-muted/10">
              <CardTitle className="text-3xl font-serif font-bold tracking-tight text-foreground">{t.header}</CardTitle>
              <CardDescription className="text-lg font-medium text-secondary mt-2">{t.title}</CardDescription>
            </CardHeader>

            <CardContent className="pt-10 pb-12 px-6 md:px-12">
              <div className="mb-10 p-6 rounded-2xl bg-secondary/5 border border-secondary/20 flex flex-col md:flex-row items-center gap-6 group transition-all hover:bg-secondary/10">
                <div className="h-16 w-16 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="h-8 w-8 text-secondary" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg font-bold text-foreground">{t.viewDocument}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t.documentDescription}</p>
                </div>
                <Button 
                  asChild
                  variant="outline" 
                  className="border-secondary text-secondary hover:bg-secondary hover:text-white font-bold px-8 h-12 rounded-xl transition-all"
                >
                  <a href="/documents/TSA_KATIBA_2025.pdf" target="_blank" rel="noopener noreferrer">
                    {lang === 'en' ? 'Open PDF' : 'Fungua PDF'}
                  </a>
                </Button>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <UserCheck className="h-5 w-5 text-secondary" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t.idSection}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">{t.firstName}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11 border-border/60 focus:ring-secondary/20 transition-all font-medium" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">{t.lastName}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11 border-border/60 focus:ring-secondary/20 transition-all font-medium" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="streetAddress"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-sm font-semibold">{t.streetAddress}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11 border-border/60 focus:ring-secondary/20 transition-all font-medium" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">{t.city}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11 border-border/60 focus:ring-secondary/20 transition-all font-medium" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold">{t.state}</FormLabel>
                              <FormControl>
                                <Input className="bg-muted/30 h-11 border-border/60 focus:ring-secondary/20 transition-all font-medium" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold">{t.zipCode}</FormLabel>
                              <FormControl>
                                <Input className="bg-muted/30 h-11 border-border/60 focus:ring-secondary/20 transition-all font-medium" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">{t.email}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11 border-border/60 focus:ring-secondary/20 transition-all font-medium" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">{t.phone}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11 border-border/60 focus:ring-secondary/20 transition-all font-medium" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-6 pt-4">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <ShieldCheck className="h-5 w-5 text-secondary" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t.declarationSection}</h3>
                    </div>

                    <FormField
                      control={form.control}
                      name="agreement1"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-4 rounded-xl bg-muted/20 border border-border/40 transition-colors hover:bg-muted/30">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium leading-relaxed">{t.agreement1}</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="agreement2"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-4 rounded-xl bg-muted/20 border border-border/40 transition-colors hover:bg-muted/30">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium leading-relaxed">{t.agreement2}</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-6 pt-4">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <FileText className="h-5 w-5 text-secondary" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t.signingSection}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl bg-secondary/5 border border-secondary/10">
                      <FormField
                        control={form.control}
                        name="signature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">{t.signature}</FormLabel>
                            <FormControl>
                              <Input className="bg-white border-border/60 h-12 focus:ring-secondary/20 transition-all font-serif italic text-xl px-4" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="agreementDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">{t.date}</FormLabel>
                            <FormControl>
                              <Input className="bg-white border-border/60 h-12 focus:ring-secondary/20 transition-all font-medium" type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full text-xl h-16 bg-secondary hover:bg-secondary/90 text-white font-bold shadow-xl shadow-secondary/20 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        {t.submitting}
                      </span>
                    ) : t.submit}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
}
