import { z } from 'zod';
import { isRegionSlug } from '@/config/regions';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https?:\/\//i.test(v), 'Debe empezar con http:// o https://');

export const partnerSchema = z.object({
  region_slug: z.string().refine(isRegionSlug, 'Provincia inválida'),
  name: z.string().trim().min(2, 'Ingresá el nombre').max(120),
  category: z.enum(['veterinaria', 'petshop', 'guarderia', 'peluqueria', 'refugio', 'otro']),
  description: optionalText(600),
  address: z.string().trim().min(3, 'Ingresá la dirección').max(200),
  city: optionalText(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: optionalText(40),
  whatsapp: optionalText(40),
  website: optionalUrl,
  instagram: optionalText(100),
  logo_url: optionalUrl,
  is_24h: z.boolean().default(false),
  plan: z.enum(['basico', 'destacado']).default('basico'),
  active: z.boolean().default(true),
  valid_until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (AAAA-MM-DD)')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  owner_contact: optionalText(200),
  internal_notes: optionalText(1000),
});

export type PartnerInput = z.input<typeof partnerSchema>;
export type PartnerParsed = z.output<typeof partnerSchema>;
