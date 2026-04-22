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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { submitMembership } from '@/features/membership/actions';
import { useLanguage } from '@/components/language-context';
import { AlertCircle, FileText, CheckCircle2, ShieldAlert, Plus, Trash2 } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const translations = {
  en: {
    header: "TANZANIA SHARING ASSOCIATION (TSA)",
    subTitle: "Membership Agreement (TSA)",
    cautionTitle: "CAUTION",
    cautionText: "Please fill out this form with integrity and great care. Ensure all information is accurate. TSA reserves the right to terminate membership or take legal action if information is found to be fraudulent or intended to harm the association.",
    firstName: "First Name",
    lastName: "Last Name",
    streetAddress: "Street Address",
    city: "City",
    state: "State",
    zipCode: "Zip Code",
    email: "Email",
    phone: "Phone Number",
    placeholder: "Type here",
    dob: "Date of Birth",
    pob: "Place of Birth",
    spouseName: "Spouse Name",
    spousePhone: "Spouse Phone",
    children: "Children",
    childName: "Child Name",
    childDob: "Child Date of Birth",
    fatherInfo: "Father Information",
    motherInfo: "Mother Information",
    parentName: "Full Name",
    parentAge: "Age",
    parentResidence: "Residence (City/State)",
    siblingsInfo: "Brothers & Sisters",
    siblingName: "Name",
    siblingAge: "Age",
    siblingResidence: "Residence",
    funeralSupervisors: "Funeral Supervisor(s) (At least 2, one residing in the USA)",
    supervisorName: "Supervisor Name",
    supervisorPhone: "Phone Number",
    supervisorResidence: "Residence",
    witnesses: "Witnesses (Full Names and Phone Numbers)",
    witnessName: "Witness Name",
    witnessPhone: "Witness Phone",
    agreement1: "I confirm my membership in TSA for a 5-year contract (2025-2030). I understand that if I withdraw before the contract ends, I must refund all contributions received.",
    agreement2: "I promise to follow all TSA laws, rules, and procedures starting from 2025. Violation may lead to termination without refund of contributions.",
    signature: "Digital Signature (Full Name)",
    date: "Date of Agreement",
    idUpload: "Upload Your ID (Passport/Government ID)",
    submit: "Submit Application",
    submitting: "Submitting Application...",
    fileSelect: "Select file/document",
    personalSection: "Personal Information",
    familySection: "Family Information",
    emergencySection: "Supervisors & Witnesses",
    agreementSection: "Legal Agreements",
    verificationSection: "Verification",
    addMore: "Add More",
    remove: "Remove"
  },
  sw: {
    header: "TANZANIA SHARING ASSOCIATION (TSA)",
    subTitle: "Makubaliano Kati ya Mwanachama na Kikundi (TSA)",
    cautionTitle: "ANGALIZO",
    cautionText: "Tafadhali jaza fomu hii kwa uadilifu, uangalifu na umakini mkubwa. Hakikisha taarifa zote unazoandika ni sahihi bila kupindisha. TSA itakuwa na haki ya kukufuta uanachama, au kukuchukulia hatua za kisheria wakati wowote endapo itabainika taarifa ulizozitoa ni za udanganyifu, au ulizitoa kwa lengo la kukihujumu kikundi.",
    firstName: "Jina la Kwanza",
    lastName: "Jina la Ukoo",
    streetAddress: "Anuani ya Mtaa",
    city: "Mji",
    state: "Jimbo",
    zipCode: "Zip Code",
    email: "Barua Pepe (Email)",
    phone: "Namba ya Simu (Phone Number)",
    placeholder: "Andika hapa",
    dob: "Tarehe ya Kuzaliwa",
    pob: "Mahali pa Kuzaliwa",
    spouseName: "Jina la Mwenza",
    spousePhone: "Simu ya Mwenza",
    children: "Watoto",
    childName: "Jina la Mtoto",
    childDob: "Tarehe ya Kuzaliwa",
    fatherInfo: "Taarifa za Baba",
    motherInfo: "Taarifa za Mama",
    parentName: "Jina Kamili",
    parentAge: "Umri",
    parentResidence: "Makazi",
    siblingsInfo: "Ndugu (Kaka/Dada)",
    siblingName: "Jina",
    siblingAge: "Umri",
    siblingResidence: "Makazi",
    funeralSupervisors: "Wasimamizi wa Msiba (Wawili, mmoja aishie USA)",
    supervisorName: "Jina la Msimamizi",
    supervisorPhone: "Namba ya Simu",
    supervisorResidence: "Makazi",
    witnesses: "Mashahidi",
    witnessName: "Jina la Shahidi",
    witnessPhone: "Simu ya Shahidi",
    agreement1: "Mimi mwenye jina na sahihi iliyowekwa hapa chini, nathibitisha kujiunga na TSA kwa mkataba wa miaka mitano (2025 - 2030). Nafahamu kwamba, kama nikiamua kujitoa kwenye chama kabla ya mkataba kuisha nitalazimika kurudisha fedha zote nilizochangiwa.",
    agreement2: "Naahidi kufuata sheria, kanuni na taratibu zote zilizowekwa na TSA kuanzia mwaka 2025. Endapo nitakiuka kanuni na taratibu those TSA itakuwa na haki ya kunivua uanachama bila kunirudishia pesa nilizochangia.",
    signature: "Sahihi ya Muomba Uanachama (Name and Signature)",
    date: "Tarehe ya Makubaliano (Date of Agreement)",
    idUpload: "Tuma Kitambulisho (Upload Your ID)",
    submit: "Tuma Maombi",
    submitting: "Inatuma Maombi...",
    fileSelect: "Chagua faili/nyaraka",
    personalSection: "Taarifa Binafsi",
    familySection: "Taarifa za Familia",
    emergencySection: "Wasimamizi na Mashahidi",
    agreementSection: "Makubaliano",
    verificationSection: "Vihakiki",
    addMore: "Ongeza",
    remove: "Ondoa"
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
  dob: z.string().min(1, "Required"),
  pob: z.string().min(2, "Required"),
  spouseName: z.string().optional(),
  spousePhone: z.string().optional(),
  fatherName: z.string().min(2, "Required"),
  fatherAge: z.string().min(1, "Required"),
  fatherResidence: z.string().min(2, "Required"),
  motherName: z.string().min(2, "Required"),
  motherAge: z.string().min(1, "Required"),
  motherResidence: z.string().min(2, "Required"),
  children: z.array(z.object({
    name: z.string().min(2, "Required"),
    dob: z.string().min(1, "Required"),
  })),
  siblings: z.array(z.object({
    name: z.string().min(2, "Required"),
    age: z.string().min(1, "Required"),
    residence: z.string().min(2, "Required"),
  })),
  funeralSupervisors: z.array(z.object({
    name: z.string().min(2, "Required"),
    phone: z.string().min(10, "Required"),
    residence: z.string().min(2, "Required"),
  })).min(2, "At least 2 supervisors required"),
  witnesses: z.array(z.object({
    name: z.string().min(2, "Required"),
    phone: z.string().min(10, "Required"),
  })).min(2, "At least 2 witnesses required"),
  agreement1: z.boolean().refine(v => v === true, "Required"),
  agreement2: z.boolean().refine(v => v === true, "Required"),
  signature: z.string().min(3, "Required"),
  agreementDate: z.string().min(1, "Required"),
  idFile: z.any()
    .refine((files) => files?.length === 1, "ID Upload is required")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, "Max file size is 10MB"),
});

export default function MembershipPage() {
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
      dob: "",
      pob: "",
      spouseName: "",
      spousePhone: "",
      fatherName: "",
      fatherAge: "",
      fatherResidence: "",
      motherName: "",
      motherAge: "",
      motherResidence: "",
      children: [{ name: "", dob: "" }],
      siblings: [{ name: "", age: "", residence: "" }],
      funeralSupervisors: [
        { name: "", phone: "", residence: "" },
        { name: "", phone: "", residence: "" }
      ],
      witnesses: [
        { name: "", phone: "" },
        { name: "", phone: "" }
      ],
      signature: "",
      agreementDate: new Date().toISOString().split('T')[0],
      agreement1: false,
      agreement2: false,
    },
  });

  const { fields: childFields, append: appendChild, remove: removeChild } = useFieldArray({
    control: form.control,
    name: "children"
  });

  const { fields: siblingFields, append: appendSibling, remove: removeSibling } = useFieldArray({
    control: form.control,
    name: "siblings"
  });

  const { fields: supervisorFields, append: appendSupervisor, remove: removeSupervisor } = useFieldArray({
    control: form.control,
    name: "funeralSupervisors"
  });

  const { fields: witnessFields, append: appendWitness, remove: removeWitness } = useFieldArray({
    control: form.control,
    name: "witnesses"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (key === 'idFile') {
          if (value && value[0]) {
            formData.append(key, value[0]);
          }
        } else if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value as string);
        }
      });

      const result = await submitMembership(formData);

      if (!result.success) throw new Error(result.error);

      toast.success(lang === 'en' ? "Application submitted successfully!" : "Maombi yametumwa kwa mafanikio!");
      form.reset();
    } catch (error) {
      toast.error(lang === 'en' ? "Submission failed. Please check your connection." : "Imeshindikana kutuma. Tafadhali jaribu tena.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-muted/30 pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">

          <Card className="border border-border/50 shadow-2xl shadow-primary/5 bg-card overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader className="pt-10 pb-6 text-center border-b border-border/30 bg-muted/10">
              <CardTitle className="text-3xl font-serif font-bold tracking-tight text-foreground">{t.header}</CardTitle>
              <CardDescription className="text-lg font-medium text-primary mt-2">{t.subTitle}</CardDescription>
            </CardHeader>

            <CardContent className="pt-8 pb-12 px-6 md:px-12">
              {/* Alert Box */}
              <div className="mb-10 p-6 rounded-xl border-l-4 border-l-amber-500 bg-amber-50 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldAlert className="h-6 w-6 text-amber-600" />
                  <h4 className="font-bold text-lg uppercase tracking-wide">{t.cautionTitle}</h4>
                </div>
                <p className="text-base leading-relaxed font-medium">
                  {t.cautionText}
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">

                  {/* Basic Info */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t.personalSection}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-foreground/80">{t.firstName}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11 border-border/60 focus:ring-primary/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
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
                            <FormLabel className="text-sm font-semibold text-foreground/80">{t.lastName}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11 border-border/60 focus:ring-primary/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
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
                            <FormLabel className="text-sm font-semibold text-foreground/80">{t.streetAddress}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11 border-border/60 focus:ring-primary/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
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
                            <FormLabel className="text-sm font-semibold text-foreground/80">{t.city}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11 border-border/60 focus:ring-primary/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
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
                              <FormLabel className="text-sm font-semibold text-foreground/80">{t.state}</FormLabel>
                              <FormControl>
                                <Input className="bg-muted/30 h-11 border-border/60 focus:ring-primary/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
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
                              <FormLabel className="text-sm font-semibold text-foreground/80">{t.zipCode}</FormLabel>
                              <FormControl>
                                <Input className="bg-muted/30 h-11 border-border/60 focus:ring-primary/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
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
                            <FormLabel className="text-sm font-semibold text-foreground/80">{t.email}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11 border-border/60 focus:ring-primary/20 transition-all font-medium" type="email" placeholder={t.placeholder} {...field} />
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
                            <FormLabel className="text-sm font-semibold text-foreground/80">{t.phone}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11 border-border/60 focus:ring-primary/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dob"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-foreground/80">{t.dob}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11 border-border/60 focus:ring-primary/20 transition-all font-medium" type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pob"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-foreground/80">{t.pob}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11 border-border/60 focus:ring-primary/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Family */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t.familySection}</h3>
                    </div>

                    <div className="space-y-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField
                          control={form.control}
                          name="spouseName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-foreground/80">{t.spouseName}</FormLabel>
                              <FormControl>
                                <Input className="bg-muted/30 h-11 border-border/60 focus:ring-primary/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="spousePhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-foreground/80">{t.spousePhone}</FormLabel>
                              <FormControl>
                                <Input className="bg-muted/30 h-11 border-border/60 focus:ring-primary/20 transition-all font-medium" placeholder={t.placeholder} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Children List */}
                      <div className="space-y-4">
                        <FormLabel className="text-sm font-bold text-foreground/80 uppercase tracking-wider">{t.children}</FormLabel>
                        {childFields.map((field, index) => (
                          <div key={field.id} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end p-4 rounded-xl bg-muted/20 border border-border/40 animate-in fade-in slide-in-from-left-2 duration-300">
                            <FormField
                              control={form.control}
                              name={`children.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-4">
                                  <FormLabel className="text-xs font-semibold">{t.childName}</FormLabel>
                                  <FormControl>
                                    <Input className="bg-white h-10 border-border/60" placeholder={t.childName} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`children.${index}.dob`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel className="text-xs font-semibold">{t.childDob}</FormLabel>
                                  <FormControl>
                                    <Input className="bg-white h-10 border-border/60" type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 h-10 w-10"
                              onClick={() => removeChild(index)}
                              disabled={childFields.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 border-dashed border-2 hover:bg-primary/5 hover:border-primary transition-all gap-2"
                          onClick={() => appendChild({ name: "", dob: "" })}
                        >
                          <Plus className="h-4 w-4" /> {t.addMore}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
                        {/* Father Info */}
                        <div className="space-y-4 p-6 rounded-xl bg-muted/10 border border-border/30">
                          <h4 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-primary" /> {t.fatherInfo}
                          </h4>
                          <FormField
                            control={form.control}
                            name="fatherName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold">{t.parentName}</FormLabel>
                                <FormControl>
                                  <Input className="bg-white h-10 border-border/60" placeholder={t.placeholder} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="fatherAge"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-semibold">{t.parentAge}</FormLabel>
                                  <FormControl>
                                    <Input className="bg-white h-10 border-border/60" placeholder="--" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="fatherResidence"
                              render={({ field }) => (
                                <FormItem className="col-span-2">
                                  <FormLabel className="text-xs font-semibold">{t.parentResidence}</FormLabel>
                                  <FormControl>
                                    <Input className="bg-white h-10 border-border/60" placeholder={t.placeholder} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Mother Info */}
                        <div className="space-y-4 p-6 rounded-xl bg-muted/10 border border-border/30">
                          <h4 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-primary" /> {t.motherInfo}
                          </h4>
                          <FormField
                            control={form.control}
                            name="motherName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold">{t.parentName}</FormLabel>
                                <FormControl>
                                  <Input className="bg-white h-10 border-border/60" placeholder={t.placeholder} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="motherAge"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-semibold">{t.parentAge}</FormLabel>
                                  <FormControl>
                                    <Input className="bg-white h-10 border-border/60" placeholder="--" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="motherResidence"
                              render={({ field }) => (
                                <FormItem className="col-span-2">
                                  <FormLabel className="text-xs font-semibold">{t.parentResidence}</FormLabel>
                                  <FormControl>
                                    <Input className="bg-white h-10 border-border/60" placeholder={t.placeholder} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Siblings List */}
                      <div className="space-y-4 pt-4">
                        <FormLabel className="text-sm font-bold text-foreground/80 uppercase tracking-wider">{t.siblingsInfo}</FormLabel>
                        {siblingFields.map((field, index) => (
                          <div key={field.id} className="grid grid-cols-1 md:grid-cols-10 gap-4 items-end p-4 rounded-xl bg-muted/20 border border-border/40 animate-in fade-in slide-in-from-left-2 duration-300">
                            <FormField
                              control={form.control}
                              name={`siblings.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-4">
                                  <FormLabel className="text-xs font-semibold">{t.siblingName}</FormLabel>
                                  <FormControl>
                                    <Input className="bg-white h-10 border-border/60" placeholder={t.siblingName} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`siblings.${index}.age`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-1">
                                  <FormLabel className="text-xs font-semibold">{t.siblingAge}</FormLabel>
                                  <FormControl>
                                    <Input className="bg-white h-10 border-border/60" placeholder="--" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`siblings.${index}.residence`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-4">
                                  <FormLabel className="text-xs font-semibold">{t.siblingResidence}</FormLabel>
                                  <FormControl>
                                    <Input className="bg-white h-10 border-border/60" placeholder={t.placeholder} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 h-10 w-10"
                              onClick={() => removeSibling(index)}
                              disabled={siblingFields.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 border-dashed border-2 hover:bg-primary/5 hover:border-primary transition-all gap-2"
                          onClick={() => appendSibling({ name: "", age: "", residence: "" })}
                        >
                          <Plus className="h-4 w-4" /> {t.addMore}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Emergency & Witnesses */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <AlertCircle className="h-5 w-5 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t.emergencySection}</h3>
                    </div>

                    <div className="space-y-10">
                      {/* Funeral Supervisors List */}
                      <div className="space-y-4">
                        <FormLabel className="text-sm font-bold text-foreground/80 uppercase tracking-wider">{t.funeralSupervisors}</FormLabel>
                        {supervisorFields.map((field, index) => (
                          <div key={field.id} className="grid grid-cols-1 md:grid-cols-10 gap-4 items-end p-4 rounded-xl bg-muted/20 border border-border/40 animate-in fade-in slide-in-from-left-2 duration-300">
                            <FormField
                              control={form.control}
                              name={`funeralSupervisors.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-3">
                                  <FormLabel className="text-xs font-semibold">{t.supervisorName}</FormLabel>
                                  <FormControl>
                                    <Input className="bg-white h-10 border-border/60" placeholder={t.supervisorName} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`funeralSupervisors.${index}.phone`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-3">
                                  <FormLabel className="text-xs font-semibold">{t.supervisorPhone}</FormLabel>
                                  <FormControl>
                                    <Input className="bg-white h-10 border-border/60" placeholder="--" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`funeralSupervisors.${index}.residence`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-3">
                                  <FormLabel className="text-xs font-semibold">{t.supervisorResidence}</FormLabel>
                                  <FormControl>
                                    <Input className="bg-white h-10 border-border/60" placeholder={t.placeholder} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 h-10 w-10"
                              onClick={() => removeSupervisor(index)}
                              disabled={supervisorFields.length <= 2}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 border-dashed border-2 hover:bg-primary/5 hover:border-primary transition-all gap-2"
                          onClick={() => appendSupervisor({ name: "", phone: "", residence: "" })}
                        >
                          <Plus className="h-4 w-4" /> {t.addMore}
                        </Button>
                      </div>

                      {/* Witnesses List */}
                      <div className="space-y-4 pt-4">
                        <FormLabel className="text-sm font-bold text-foreground/80 uppercase tracking-wider">{t.witnesses}</FormLabel>
                        {witnessFields.map((field, index) => (
                          <div key={field.id} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end p-4 rounded-xl bg-muted/20 border border-border/40 animate-in fade-in slide-in-from-left-2 duration-300">
                            <FormField
                              control={form.control}
                              name={`witnesses.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-3">
                                  <FormLabel className="text-xs font-semibold">{t.witnessName}</FormLabel>
                                  <FormControl>
                                    <Input className="bg-white h-10 border-border/60" placeholder={t.witnessName} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`witnesses.${index}.phone`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-3">
                                  <FormLabel className="text-xs font-semibold">{t.witnessPhone}</FormLabel>
                                  <FormControl>
                                    <Input className="bg-white h-10 border-border/60" placeholder="--" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 h-10 w-10"
                              onClick={() => removeWitness(index)}
                              disabled={witnessFields.length <= 2}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 border-dashed border-2 hover:bg-primary/5 hover:border-primary transition-all gap-2"
                          onClick={() => appendWitness({ name: "", phone: "" })}
                        >
                          <Plus className="h-4 w-4" /> {t.addMore}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Agreement Section */}
                  <div className="space-y-8 pt-6">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <ShieldAlert className="h-5 w-5 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t.agreementSection}</h3>
                    </div>

                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="agreement1"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-4 space-y-0 p-6 rounded-xl bg-primary/5 border border-primary/10 transition-shadow hover:shadow-md">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mt-1"
                              />
                            </FormControl>
                            <div className="space-y-1">
                              <FormLabel className="text-[15px] font-medium leading-relaxed text-foreground/90">
                                {t.agreement1}
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="agreement2"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-4 space-y-0 p-6 rounded-xl bg-primary/5 border border-primary/10 transition-shadow hover:shadow-md">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mt-1"
                              />
                            </FormControl>
                            <div className="space-y-1">
                              <FormLabel className="text-[15px] font-medium leading-relaxed text-foreground/90">
                                {t.agreement2}
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                      <FormField
                        control={form.control}
                        name="signature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-foreground/80">{t.signature}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-12 border-border/60 focus:border-primary transition-all font-serif italic text-xl px-4" placeholder={t.placeholder} {...field} />
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
                            <FormLabel className="text-sm font-semibold text-foreground/80">{t.date}</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-12 border-border/60 focus:border-primary transition-all font-medium" type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* ID Upload */}
                  <div className="space-y-6 pt-6">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t.verificationSection}</h3>
                    </div>

                    <FormField
                      control={form.control}
                      name="idFile"
                      render={({ field: { value, onChange, ...fieldProps } }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground/80">{t.idUpload}</FormLabel>
                          <FormControl>
                            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/60 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors group">
                              <Input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                id="id-upload-input"
                                onChange={(event) => onChange(event.target.files)}
                                {...fieldProps}
                              />
                              <label
                                htmlFor="id-upload-input"
                                className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors"
                              >
                                <CheckCircle2 className="h-10 w-10 mb-2 opacity-50 group-hover:opacity-100" />
                                <span className="font-semibold text-lg">{t.fileSelect}</span>
                                <span className="text-xs">Max 10MB (JPG, PNG, PDF)</span>
                                {value && value[0] && (
                                  <span className="mt-2 text-sm text-primary font-bold bg-primary/10 px-3 py-1 rounded-full animate-in zoom-in-95">
                                    ✓ {value[0].name}
                                  </span>
                                )}
                              </label>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-xl h-16 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xl shadow-primary/20 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
                    disabled={isSubmitting}
                  >
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
