import { z } from 'zod';

export const sightingSchema = z.object({
  lost_report_id: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  approximate_address: z.string({
    message: 'Por favor indicá la esquina o calle donde viste a la mascota',
  }).min(2, 'Por favor indicá la esquina o calle donde viste a la mascota').max(150),
  street_name: z.string().max(100).optional().nullable(),
  street_number: z.string().max(20).optional().nullable(),
  neighborhood: z.string().max(80).optional().nullable(),
  sighting_date: z.string({
    message: 'Por favor indicá cuándo la viste',
  }).min(1, 'Por favor indicá cuándo la viste'),
  photo_url: z.string().optional().nullable(),
  description: z.string({
    message: 'Por favor describí hacia dónde iba o qué viste (mínimo 5 caracteres)',
  }).min(5, 'Por favor describí hacia dónde iba o qué viste (mínimo 5 caracteres)').max(600),
  reporter_name: z.string().max(70).optional().nullable(),
  contact_phone: z.string().max(50).optional().nullable(),
  is_holding: z.boolean().optional(),
});

export type SightingInput = z.infer<typeof sightingSchema>;

