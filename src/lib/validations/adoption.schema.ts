import { z } from 'zod';
import { optionalPhoneSchema, phoneSchema, EMAIL_RE } from './contact';

const text = (max: number) => z.string().trim().max(max);
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const emailSchema = z
  .string({ message: 'Ingresá tu email' })
  .trim()
  .toLowerCase()
  .max(254)
  .refine((v) => EMAIL_RE.test(v), 'El email no tiene un formato válido (ej: nombre@gmail.com)');

export const passwordSchema = z
  .string({ message: 'Ingresá una contraseña' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña es demasiado larga');

export const dniSchema = z
  .string({ message: 'Ingresá tu DNI' })
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => /^\d{7,8}$/.test(v), 'El DNI debe tener 7 u 8 números');

export const adopterProfileSchema = z.object({
  first_name: text(60).min(2, 'Ingresá tu nombre'),
  last_name: text(60).min(2, 'Ingresá tu apellido'),
  dni: dniSchema,
  phone: phoneSchema('Ingresá un teléfono o WhatsApp'),
  address: text(150).min(5, 'Ingresá tu domicilio (calle y número)'),
  city: optText(80),
});

export const associationSchema = z.object({
  name: text(100).min(3, 'Ingresá el nombre de la asociación o refugio'),
  description: optText(1000),
  city: text(80).min(2, 'Ingresá la ciudad'),
  region_slug: text(40).min(2, 'Elegí la provincia'),
  phone: optionalPhoneSchema,
  whatsapp: optionalPhoneSchema,
  email: emailSchema,
  instagram: optText(60).transform((v) => (v ? v.replace(/^@/, '').replace(/[^\w.]/g, '') || null : null)),
});

export const animalSchema = z.object({
  name: text(50).min(1, 'Ingresá el nombre del animal'),
  species: z.enum(['dog', 'cat', 'other'], { message: 'Elegí la especie' }),
  breed: optText(80),
  sex: z.enum(['male', 'female', 'unknown']).default('unknown'),
  size: z
    .enum(['small', 'medium', 'large', ''])
    .optional()
    .transform((v) => (v ? v : null)),
  age: optText(40),
  description: optText(1500),
  neutered: z.boolean().default(false),
  photos: z.array(z.string()).max(6, 'Máximo 6 fotos'),
});

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida');

export type AnimalInput = z.infer<typeof animalSchema>;
