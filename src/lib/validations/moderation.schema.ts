import { z } from 'zod';

export const moderationReportSchema = z.object({
  reported_entity_type: z.enum(['lost_report', 'found_report', 'sighting', 'user']),
  reported_entity_id: z.string().uuid('ID de entidad inválido'),
  reason: z.enum(['false_information', 'spam', 'inappropriate_content', 'scam', 'duplicate', 'other'], {
    message: 'Seleccioná el motivo de la denuncia',
  }),
  details: z.string().max(500, 'Máximo 500 caracteres').optional().nullable(),
});

export type ModerationReportInput = z.infer<typeof moderationReportSchema>;
