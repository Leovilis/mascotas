'use client';

import React, { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizePhoneInput } from '@/lib/validations/contact';

export const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500';

export function SubmitButton({
  children,
  className,
  variant = 'primary',
  confirm,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'danger' | 'ghost';
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60',
        variant === 'primary' && 'bg-emerald-600 hover:bg-emerald-700 text-white',
        variant === 'danger' && 'bg-rose-600 hover:bg-rose-700 text-white',
        variant === 'ghost' && 'border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800',
        className
      )}
    >
      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

/** Teléfono: no deja escribir letras */
export function PhoneInput({ name, defaultValue, required, placeholder }: { name: string; defaultValue?: string | null; required?: boolean; placeholder?: string }) {
  const [value, setValue] = useState(defaultValue || '');
  return (
    <input
      name={name}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      required={required}
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(sanitizePhoneInput(e.target.value))}
      className={inputClass}
    />
  );
}

/** DNI: solo números */
export function DniInput({ defaultValue }: { defaultValue?: string | null }) {
  const [value, setValue] = useState(defaultValue || '');
  return (
    <input
      name="dni"
      inputMode="numeric"
      required
      maxLength={12}
      value={value}
      placeholder="Ej: 30123456"
      onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 8))}
      className={inputClass}
    />
  );
}
