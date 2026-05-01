'use client';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { submitRenewal } from '@/features/membership/actions';
import { useLanguage } from '@/components/language-context';
import { translations } from '@/lib/translations';
import { FileText, Users, ShieldCheck, MapPin, Phone, Info } from 'lucide-react';

/**
 * Dev Note for New Grad:
 * We use the 'accent' color (Gold) for the Renewal form to differentiate it 
 * from the Membership form (Green). This maintains a distinct identity for 
 * renewals while using the same layout patterns for consistency.
 */
const formSchema = z.object({
  fullName: z.string().min(3, "Full name is required"),
  address: z.string().min(5, "Address is required"),
  phone: z.string().min(10, "Phone number is required"),
  witnesses: z.array(z.object({
    name: z.string().min(2, "Required"),
    phone: z.string().min(10, "Required"),
  })).length(2, "Exactly 2 witnesses are required"),
  administrators: z.array(z.object({
    name: z.string().min(2, "Required"),
    relationship: z.string().min(2, "Required"),
    phone: z.string().min(10, "Required"),
    residesInUSA: z.boolean().default(false),
  })).length(2, "Exactly 2 administrators are required")
    .refine(admins => admins.some(a => a.residesInUSA), {
      message: "At least one administrator must reside in the USA",
      path: [0, "residesInUSA"] 
    }),
  agreement: z.boolean().refine(v => v === true, "You must accept the agreement"),
  signature: z.string().min(3, "Digital signature is required"),
  agreementDate: z.string().min(1, "Date is required"),
});

export default function RenewalPage() {
  const { language: lang } = useLanguage();
  const t = translations[lang].renewal;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      address: "",
      phone: "",
      witnesses: [
        { name: "", phone: "" },
        { name: "", phone: "" }
      ],
      administrators: [
        { name: "", relationship: "", phone: "", residesInUSA: false },
        { name: "", relationship: "", phone: "", residesInUSA: false }
      ],
      agreement: false,
      signature: "",
      agreementDate: new Date().toISOString().split('T')[0],
    },
  });

  const { fields: witnessFields } = useFieldArray({
    control: form.control,
    name: "witnesses"
  });

  const { fields: adminFields } = useFieldArray({
    control: form.control,
    name: "administrators"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });

      const result = await submitRenewal(formData);

      if (!result.success) throw new Error(result.error);

      toast.success(t.success);
      form.reset();
    } catch (error) {
      toast.error(t.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-muted/30 pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="border border-border/50 shadow-2xl shadow-accent/5 bg-card overflow-hidden">
            {/* Pure Gold Header Bar */}
            <div className="h-2 bg-accent w-full" />
            
            <CardHeader className="pt-10 pb-6 text-center border-b border-border/30 bg-muted/10">
              <CardTitle className="text-3xl font-serif font-bold tracking-tight text-foreground uppercase tracking-wide">
                {t.title}
              </CardTitle>
              <CardDescription className="text-lg font-medium text-accent mt-2">
                {t.subtitle}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-8 pb-12 px-6 md:px-12">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
                  
                  {/* 1. Personal Information */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <FileText className="h-5 w-5 text-accent" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                        {t.personalSection}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-sm font-semibold">{t.fullName}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11 border-border/60 focus:ring-accent/20" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">{t.address}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/50" />
                                <Input className="bg-muted/30 h-11 pl-10 border-border/60" {...field} />
                              </div>
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
                              <div className="relative">
                                <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/50" />
                                <Input className="bg-muted/30 h-11 pl-10 border-border/60" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* 2. Witnesses */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <Users className="h-5 w-5 text-accent" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                        {t.witnessesSection}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {witnessFields.map((field, index) => (
                        <div key={field.id} className="p-6 rounded-xl bg-muted/10 border border-border/30 space-y-4">
                          <h4 className="text-xs font-bold text-accent uppercase tracking-widest">
                            {lang === 'sw' ? `Shahidi ${index + 1}` : `Witness ${index + 1}`}
                          </h4>
                          <FormField
                            control={form.control}
                            name={`witnesses.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold">{t.witnessName}</FormLabel>
                                <FormControl>
                                  <Input className="bg-white h-10 border-border/60" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`witnesses.${index}.phone`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold">{t.witnessPhone}</FormLabel>
                                <FormControl>
                                  <Input className="bg-white h-10 border-border/60" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Administrators */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <ShieldCheck className="h-5 w-5 text-accent" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                        {t.adminSection}
                      </h3>
                    </div>

                    <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 flex items-start gap-3 mb-4">
                      <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-accent-foreground leading-snug">
                        {t.adminNote}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {adminFields.map((field, index) => (
                        <div key={field.id} className="p-6 rounded-xl bg-muted/10 border border-border/30 space-y-4">
                          <h4 className="text-xs font-bold text-accent uppercase tracking-widest">
                            {lang === 'sw' ? `Msimamizi ${index + 1}` : `Admin ${index + 1}`}
                          </h4>
                          <FormField
                            control={form.control}
                            name={`administrators.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold">{t.adminName}</FormLabel>
                                <FormControl>
                                  <Input className="bg-white h-10 border-border/60" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`administrators.${index}.relationship`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold">{t.adminRelationship}</FormLabel>
                                <FormControl>
                                  <Input className="bg-white h-10 border-border/60" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`administrators.${index}.phone`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold">{t.adminPhone}</FormLabel>
                                <FormControl>
                                  <Input className="bg-white h-10 border-border/60" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`administrators.${index}.residesInUSA`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 rounded-md border border-border/40 bg-white/50">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-xs font-medium cursor-pointer">
                                    {lang === 'sw' ? 'Makaazi ya Marekani' : 'Resides in USA'}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. Agreement - Pure Gold Theme */}
                  <div className="space-y-6 pt-4">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <ShieldCheck className="h-5 w-5 text-accent" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                        {t.agreementSection}
                      </h3>
                    </div>

                    <div className="p-8 rounded-2xl border-2 border-accent bg-accent/5 shadow-inner">
                      <div className="space-y-6 text-foreground/90 italic font-medium leading-relaxed">
                        {/* 
                            Dev Note: We only show the translation for the currently selected language.
                            This ensures consistency with the rest of the site's language toggle.
                        */}
                        <p className="border-l-4 border-accent pl-6">
                          {lang === 'en' ? t.agreementTextEn : t.agreementTextSw}
                        </p>
                      </div>

                      <div className="mt-8 pt-8 border-t border-accent/20">
                        <FormField
                          control={form.control}
                          name="agreement"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="h-6 w-6 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-bold cursor-pointer text-accent-foreground">
                                  {lang === 'sw' 
                                    ? 'Tafadhali weka alama ya vyema (✓) kukubali masharti' 
                                    : 'Please tick (✓) to accept the terms'}
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Signature Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                      <FormField
                        control={form.control}
                        name="signature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">{t.signature}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  className="bg-muted/30 h-14 border-b-2 border-x-0 border-t-0 border-border focus:border-accent focus:ring-0 rounded-none font-serif text-2xl px-4" 
                                  placeholder={lang === 'sw' ? "Sahihi yako..." : "Sign here..."} 
                                  {...field} 
                                />
                                <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground uppercase font-bold tracking-tighter opacity-50">
                                  {lang === 'sw' ? 'Sahihi ya Kidijitali' : 'Digital Signature'}
                                </div>
                              </div>
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
                              <Input className="bg-muted/30 h-14 border-border/60" type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Submit Button - Gold Theme */}
                  <div className="pt-10">
                    <Button 
                      type="submit" 
                      className="w-full h-14 text-lg font-bold uppercase tracking-widest bg-accent hover:bg-accent/90 text-accent-foreground shadow-xl transition-all hover:scale-[1.01]"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? t.submitting : t.submit}
                    </Button>
                  </div>

                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
