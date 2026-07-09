import { z } from 'zod';

export const memberFormSchema = z.object({
  names: z.string().min(2, 'Full Name must be at least 2 characters'),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  husbandWife: z.string().optional().or(z.literal('')),
  spousePhone: z.string().optional().or(z.literal('')),
  parents: z.array(z.string()).default([]),
  children: z.array(z.string()).default([]),
  siblings: z.array(z.string()).default([]),
  witnesses: z.array(z.object({
    name: z.string().min(1, 'Witness name required'),
    phone: z.string().optional().or(z.literal('')),
  })).default([]),
  nextOfKin: z.array(z.object({
    name: z.string().min(1, 'Next of Kin name required'),
    phone: z.string().optional().or(z.literal('')),
  })).default([]),
});

export type MemberFormInput = z.infer<typeof memberFormSchema>;
