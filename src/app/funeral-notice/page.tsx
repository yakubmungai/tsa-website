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
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { submitFuneralNotice } from '@/features/funeral/actions';
import { useLanguage } from '@/components/language-context';
import { Heart, User, MapPin, AlertCircle, Info } from 'lucide-react';

const translations = {
  en: {
    header: "TANZANIA SHARING ASSOCIATION (TSA)",
    subTitle: "Funeral Notice Form",
    reporterSection: "Reporter Information",
    deceasedSection: "Deceased Information",
    emergencySection: "Emergency Contacts",
    emergencyDescription: "These people will communicate important information related to this funeral",
    burialSection: "Burial Details",
    fullName: "Full Name",
    deceasedName: "Full Name of Deceased",
    relation: "Relation to Deceased",
    placeOfPassing: "Place of Passing",
    dateTimeOfPassing: "Date and Time of Passing",
    causeOfDeath: "Cause of Death",
    contactName: "Full Name",
    contactPhone: "Phone Number",
    contactLabel: "Contact",
    burialLocation: "Burial Location",
    burialDate: "Burial Date",
    placeholder: "Type here",
    submit: "Submit Notice",
    submitting: "Submitting...",
    success: "Notice submitted successfully!",
    error: "Failed to submit. Please check your connection.",
  },
  sw: {
    header: "TANZANIA SHARING ASSOCIATION (TSA)",
    subTitle: "Fomu ya Taarifa ya Msiba",
    reporterSection: "Taarifa za Mtoa Taarifa",
    deceasedSection: "Taarifa za Marehemu",
    emergencySection: "Wasiliana na Watu Hawa",
    emergencyDescription: "Watu hawa watapokea na kutoa taarifa muhimu zinazohusu msiba huu",
    burialSection: "Taarifa za Mazishi",
    fullName: "Jina Kamili",
    deceasedName: "Jina Kamili la Marehemu",
    relation: "Uhusiano wako na Marehemu",
    placeOfPassing: "Mahali Marehemu alipofarikia",
    dateTimeOfPassing: "Tarehe na Saa ya kufariki",
    causeOfDeath: "Sababu ya kifo",
    contactName: "Jina Kamili",
    contactPhone: "Nambari ya Simu",
    contactLabel: "Msimamizi",
    burialLocation: "Mahali pa Mazishi",
    burialDate: "Tarehe ya Mazishi",
    placeholder: "Andika hapa",
    submit: "Tuma Taarifa",
    submitting: "Inatuma...",
    success: "Taarifa imetumwa kwa mafanikio!",
    error: "Imeshindikana kutuma. Tafadhali jaribu tena.",
  }
};

const formSchema = z.object({
  fullName: z.string().min(2, "Required / Inahitajika"),
  deceasedName: z.string().min(2, "Required / Inahitajika"),
  relation: z.string().min(2, "Required / Inahitajika"),
  placeOfPassing: z.string().min(2, "Required / Inahitajika"),
  dateTimeOfPassing: z.string().min(1, "Required / Inahitajika"),
  causeOfDeath: z.string().min(2, "Required / Inahitajika"),
  emergencyContacts: z.array(z.object({
    fullName: z.string().min(2, "Required / Inahitajika"),
    phoneNumber: z.string().min(10, "Required / Inahitajika"),
  })).length(2, "Two contacts required / Wasimamizi wawili wanahitajika"),
  burialLocation: z.string().min(2, "Required / Inahitajika"),
  burialDate: z.string().min(1, "Required / Inahitajika"),
});

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 pb-3">
      <span className="text-primary">{icon}</span>
      <h3 className="font-serif text-xl font-bold text-foreground">{children}</h3>
    </div>
  );
}

export default function FuneralNoticePage() {
  const { language: lang } = useLanguage();
  const t = translations[lang];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      deceasedName: "",
      relation: "",
      placeOfPassing: "",
      dateTimeOfPassing: "",
      causeOfDeath: "",
      emergencyContacts: [
        { fullName: "", phoneNumber: "" },
        { fullName: "", phoneNumber: "" }
      ],
      burialLocation: "",
      burialDate: "",
    },
  });

  const { fields: contactFields } = useFieldArray({
    control: form.control,
    name: "emergencyContacts"
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
          formData.append(key, value as string);
        }
      });

      const result = await submitFuneralNotice(formData);

      if (!result.success) throw new Error(result.error);

      toast.success(result.reference ? `${t.success} (Kumbukumbu / Reference: ${result.reference})` : t.success, { duration: 12000 });
      form.reset();
    } catch {
      toast.error(t.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = "h-12 bg-background text-base";
  const labelClass = "text-base font-semibold text-foreground";

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">

          <Card className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
            <div className="h-2 w-full bg-primary" />
            <CardHeader className="border-b border-border/60 bg-muted/40 pt-10 pb-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Heart className="h-6 w-6 fill-primary text-primary" aria-hidden />
              </div>
              <CardTitle className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t.header}</CardTitle>
              <CardDescription className="mt-2 text-lg font-medium text-muted-foreground">{t.subTitle}</CardDescription>
            </CardHeader>

            <CardContent className="px-5 pt-8 pb-12 md:px-12">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

                  {/* Reporter Info */}
                  <div className="space-y-6">
                    <SectionHeading icon={<User className="h-5 w-5" aria-hidden />}>{t.reporterSection}</SectionHeading>

                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>{t.fullName}</FormLabel>
                          <FormControl>
                            <Input className={inputClass} placeholder={t.placeholder} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Deceased Info */}
                  <div className="space-y-6">
                    <SectionHeading icon={<Info className="h-5 w-5" aria-hidden />}>{t.deceasedSection}</SectionHeading>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="deceasedName"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className={labelClass}>{t.deceasedName}</FormLabel>
                            <FormControl>
                              <Input className={inputClass} placeholder={t.placeholder} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="relation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>{t.relation}</FormLabel>
                            <FormControl>
                              <Input className={inputClass} placeholder={t.placeholder} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="placeOfPassing"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>{t.placeOfPassing}</FormLabel>
                            <FormControl>
                              <Input className={inputClass} placeholder={t.placeholder} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dateTimeOfPassing"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>{t.dateTimeOfPassing}</FormLabel>
                            <FormControl>
                              <Input className={inputClass} type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="causeOfDeath"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>{t.causeOfDeath}</FormLabel>
                            <FormControl>
                              <Input className={inputClass} placeholder={t.placeholder} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Emergency Contacts */}
                  <div className="space-y-6">
                    <SectionHeading icon={<AlertCircle className="h-5 w-5" aria-hidden />}>{t.emergencySection}</SectionHeading>
                    <p className="text-base text-muted-foreground">
                      {t.emergencyDescription}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {contactFields.map((field, index) => (
                        <div key={field.id} className="space-y-4 rounded-2xl border border-border/60 bg-muted/40 p-5">
                          <div className="mb-2 flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                              {index + 1}
                            </div>
                            <span className="text-base font-bold text-foreground">{t.contactLabel} {index + 1}</span>
                          </div>
                          <FormField
                            control={form.control}
                            name={`emergencyContacts.${index}.fullName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={labelClass}>{t.contactName}</FormLabel>
                                <FormControl>
                                  <Input className="h-12 bg-card text-base" placeholder={t.contactName} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`emergencyContacts.${index}.phoneNumber`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={labelClass}>{t.contactPhone}</FormLabel>
                                <FormControl>
                                  <Input className="h-12 bg-card text-base" type="tel" inputMode="tel" placeholder={t.contactPhone} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Burial Details */}
                  <div className="space-y-6">
                    <SectionHeading icon={<MapPin className="h-5 w-5" aria-hidden />}>{t.burialSection}</SectionHeading>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="burialLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>{t.burialLocation}</FormLabel>
                            <FormControl>
                              <Input className={inputClass} placeholder={t.placeholder} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="burialDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>{t.burialDate}</FormLabel>
                            <FormControl>
                              <Input className={inputClass} type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="btn-shimmer h-16 w-full rounded-2xl border-0 text-xl font-bold text-primary-foreground disabled:opacity-70" disabled={isSubmitting}>
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
