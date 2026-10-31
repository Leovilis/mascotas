import { z } from 'zod';

/**
 * Reglas comunes de contacto (navegador y servidor).
 * Teléfono: solo dígitos, espacios, +, guiones y paréntesis, entre 8 y 15 dígitos reales.
 */
export const PHONE_ALLOWED_CHARS = /[^0-9+\s\-()]/g;
export const PHONE_RE = /^\+?[0-9\s\-()]+$/;
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

/** Para usar en onChange: borra letras y símbolos no permitidos mientras se escribe */
export function sanitizePhoneInput(value: string): string {
  return value.replace(PHONE_ALLOWED_CHARS, '').slice(0, 25);
}

export function countDigits(value: string): number {
  return (value.match(/\d/g) || []).length;
}

export function isValidPhone(value: string): boolean {
  const v = value.trim();
  const digits = countDigits(v);
  return PHONE_RE.test(v) && digits >= 8 && digits <= 15;
}

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  return v.length <= 254 && EMAIL_RE.test(v);
}

export const phoneSchema = (requiredMessage = 'Ingresá un teléfono o WhatsApp') =>
  z
    .string({ message: requiredMessage })
    .trim()
    .min(1, requiredMessage)
    .refine((v) => PHONE_RE.test(v), 'El teléfono solo puede tener números (y +, espacios o guiones)')
    .refine((v) => countDigits(v) >= 8 && countDigits(v) <= 15, 'El teléfono debe tener entre 8 y 15 números (con característica, ej: 388 412-3456)');

export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(25)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || (PHONE_RE.test(v) && countDigits(v) >= 8 && countDigits(v) <= 15), 'Teléfono inválido: solo números, entre 8 y 15 dígitos');

export const optionalEmailSchema = z
  .string()
  .trim()
  .max(254)
  .optional()
  .nullable()
  .transform((v) => (v ? v.toLowerCase() : null))
  .refine((v) => v === null || EMAIL_RE.test(v), 'El email no tiene un formato válido (ej: nombre@gmail.com)');
