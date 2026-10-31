import { z } from 'zod';

export const lostReportSchema = z.object({
  // Pet information
  name: z.string({
    message: 'Por favor ingresá el nombre de la mascota',
  }).min(1, 'Por favor ingresá el nombre de la mascota').max(50, 'Nombre demasiado largo'),
  species: z.enum(['dog', 'cat', 'bird', 'rabbit', 'other'], {
    message: 'Por favor seleccioná qué tipo de animal es (perro, gato, etc.)',
  }),
  breed: z.string().max(80, 'Raza demasiado larga').optional().nullable(),
  gender: z.enum(['male', 'female', 'unknown']).default('unknown'),
  size: z.enum(['small', 'medium', 'large', 'giant'], {
    message: 'Por favor seleccioná el tamaño aproximado de la mascota',
  }),
  primary_color: z.string({
    message: 'Por favor indicá el color principal (ej. Negro, Dorado, Marrón)',
  }).min(2, 'Por favor indicá el color principal (ej. Negro, Dorado, Marrón)').max(50),
  secondary_color: z.string().max(50).optional().nullable(),
  distinctive_features: z.string().max(300, 'Máximo 300 caracteres').optional().nullable(),
  photos: z.array(z.string()).min(1, 'Subí al menos una fotografía clara de la mascota'),

  // Location & Time
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  approximate_address: z.string({
    message: 'Por favor indicá la calle o esquina donde se extravió',
  }).min(2, 'Por favor indicá la calle o esquina donde se extravió').max(150),
  street_name: z.string().max(100).optional().nullable(),
  street_number: z.string().max(20).optional().nullable(),
  neighborhood: z.string().max(80).optional().nullable(),
  last_seen_date: z.string({
    message: 'Por favor indicá la fecha y hora aproximada de extravío',
  }).min(1, 'Por favor indicá la fecha y hora aproximada de extravío'),
  city_id: z.number().int().positive().optional().nullable(),

  // Description & Contact
  description: z.string({
    message: 'Por favor escribí cómo se extravió o qué collar llevaba (mínimo 10 caracteres)',
  }).min(10, 'Por favor escribí cómo se extravió o qué collar llevaba (mínimo 10 caracteres)').max(1000),
  contact_name: z.string({
    message: 'Por favor ingresá tu nombre o apodo de contacto',
  }).min(2, 'Por favor ingresá tu nombre o apodo de contacto').max(70),
  contact_phone: z.string({
    message: 'Por favor ingresá un teléfono o WhatsApp para que te avisen',
  }).min(6, 'Por favor ingresá un teléfono o WhatsApp para que te avisen').max(30),
  contact_phone_public: z.boolean().default(false),
});

export type LostReportInput = z.infer<typeof lostReportSchema>;
