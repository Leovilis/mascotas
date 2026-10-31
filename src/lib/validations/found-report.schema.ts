import { z } from 'zod';

export const foundReportSchema = z.object({
  // Pet information
  species: z.enum(['dog', 'cat', 'bird', 'rabbit', 'other'], {
    message: 'Por favor seleccioná qué tipo de animal es (perro, gato, etc.)',
  }),
  breed: z.string().max(80, 'Raza demasiado larga').optional().nullable(),
  gender: z.enum(['male', 'female', 'unknown']).default('unknown'),
  size: z.enum(['small', 'medium', 'large', 'giant'], {
    message: 'Por favor seleccioná el tamaño aproximado del animal',
  }),
  primary_color: z.string({
    message: 'Por favor indicá el color principal (ej. Blanco, Marrón, Negro)',
  }).min(2, 'Por favor indicá el color principal (ej. Blanco, Marrón, Negro)').max(50),
  secondary_color: z.string().max(50).optional().nullable(),
  distinctive_features: z.string().max(300).optional().nullable(),
  photos: z.array(z.string()).min(1, 'Subí al menos una fotografía clara del animal encontrado'),

  // Location & Holding state
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  approximate_address: z.string({
    message: 'Por favor indicá la calle o esquina donde lo viste',
  }).min(2, 'Por favor indicá la calle o esquina donde lo viste').max(150),
  street_name: z.string().max(100).optional().nullable(),
  street_number: z.string().max(20).optional().nullable(),
  neighborhood: z.string().max(80).optional().nullable(),
  found_date: z.string({
    message: 'Por favor indicá la fecha y hora aproximada del hallazgo',
  }).min(1, 'Por favor indicá la fecha y hora aproximada del hallazgo'),
  is_holding: z.boolean({
    message: 'Indicá si lo tenés en tu casa o si quedó en la vía pública',
  }),
  city_id: z.number().int().positive().optional().nullable(),

  // Description & Contact
  description: z.string({
    message: 'Por favor escribí una breve descripción del estado del animal (mínimo 10 caracteres)',
  }).min(10, 'Por favor escribí una breve descripción del estado del animal (mínimo 10 caracteres)').max(1000),
  contact_name: z.string({
    message: 'Por favor ingresá tu nombre para que el dueño sepa con quién habla',
  }).min(2, 'Por favor ingresá tu nombre para que el dueño sepa con quién habla').max(70),
  contact_phone: z.string({
    message: 'Por favor ingresá un teléfono o WhatsApp de contacto',
  }).min(6, 'Por favor ingresá un teléfono o WhatsApp de contacto').max(30),
});

export type FoundReportInput = z.infer<typeof foundReportSchema>;
