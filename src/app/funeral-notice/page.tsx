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
import { Heart, User, Calendar, MapPin, AlertCircle, Phone, Info } from 'lucide-react';

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
      <div className="min-h-screen bg-slate-50/50 pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">

          <Card className="border border-slate-200 shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
            <div className="h-2 bg-slate-800 w-full" />
            <CardHeader className="pt-10 pb-6 text-center border-b border-slate-100 bg-slate-50/30">
              <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Heart className="h-6 w-6 text-slate-600 fill-slate-600" />
              </div>
              <CardTitle className="text-3xl font-serif font-bold tracking-tight text-slate-900">{t.header}</CardTitle>
              <CardDescription className="text-lg font-medium text-slate-600 mt-2">{t.subTitle}</CardDescription>
            </CardHeader>

            <CardContent className="pt-8 pb-12 px-6 md:px-12">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

                  {/* Reporter Info */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <User className="h-5 w-5 text-slate-500" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">{t.reporterSection}</h3>
                    </div>

                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-slate-700">{t.fullName}</FormLabel>
                          <FormControl>
                            <Input className="bg-slate-50/50 h-11 border-slate-200 focus:ring-slate-500/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Deceased Info */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Info className="h-5 w-5 text-slate-500" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">{t.deceasedSection}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="deceasedName"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-sm font-semibold text-slate-700">{t.deceasedName}</FormLabel>
                            <FormControl>
                              <Input className="bg-slate-50/50 h-11 border-slate-200 focus:ring-slate-500/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
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
                            <FormLabel className="text-sm font-semibold text-slate-700">{t.relation}</FormLabel>
                            <FormControl>
                              <Input className="bg-slate-50/50 h-11 border-slate-200 focus:ring-slate-500/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
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
                            <FormLabel className="text-sm font-semibold text-slate-700">{t.placeOfPassing}</FormLabel>
                            <FormControl>
                              <Input className="bg-slate-50/50 h-11 border-slate-200 focus:ring-slate-500/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
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
                            <FormLabel className="text-sm font-semibold text-slate-700">{t.dateTimeOfPassing}</FormLabel>
                            <FormControl>
                              <Input className="bg-slate-50/50 h-11 border-slate-200 focus:ring-slate-500/20 transition-all font-medium" type="datetime-local" {...field} />
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
                            <FormLabel className="text-sm font-semibold text-slate-700">{t.causeOfDeath}</FormLabel>
                            <FormControl>
                              <Input className="bg-slate-50/50 h-11 border-slate-200 focus:ring-slate-500/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Emergency Contacts */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <AlertCircle className="h-5 w-5 text-slate-500" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">{t.emergencySection}</h3>
                    </div>
                    <p className="text-sm text-slate-500 italic">
                      {t.emergencyDescription}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {contactFields.map((field, index) => (
                        <div key={field.id} className="p-6 rounded-xl bg-slate-50/50 border border-slate-200 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <span className="text-sm font-bold text-slate-800">Contact {index + 1}</span>
                          </div>
                          <FormField
                            control={form.control}
                            name={`emergencyContacts.${index}.fullName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-slate-600">{t.contactName}</FormLabel>
                                <FormControl>
                                  <Input className="bg-white h-10 border-slate-200" placeholder={t.contactName} {...field} />
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
                                <FormLabel className="text-xs font-semibold text-slate-600">{t.contactPhone}</FormLabel>
                                <FormControl>
                                  <Input className="bg-white h-10 border-slate-200" placeholder={t.contactPhone} {...field} />
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
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <MapPin className="h-5 w-5 text-slate-500" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">{t.burialSection}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="burialLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-slate-700">{t.burialLocation}</FormLabel>
                            <FormControl>
                              <Input className="bg-slate-50/50 h-11 border-slate-200 focus:ring-slate-500/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
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
                            <FormLabel className="text-sm font-semibold text-slate-700">{t.burialDate}</FormLabel>
                            <FormControl>
                              <Input className="bg-slate-50/50 h-11 border-slate-200 focus:ring-slate-500/20 transition-all font-medium" type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full text-xl h-16 bg-slate-800 hover:bg-slate-900 text-white font-bold shadow-xl shadow-slate-200 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70" disabled={isSubmitting}>
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
