import React from 'react';
import { cn } from '@/lib/utils';

/** Mensaje de error (?e=) o de éxito arriba de los formularios */
export function Notice({ error, success, className }: { error?: string | null; success?: string | null; className?: string }) {
  if (!error && !success) return null;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={cn(
        'p-3.5 rounded-xl text-sm font-semibold border',
        error
          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
          : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300',
        className
      )}
    >
      {error || success}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-zinc-500">{hint}</span>}
    </label>
  );
}

export function Card({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn('p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4', className)}>
      {children}
    </section>
  );
}

/** Lee un parámetro de búsqueda como texto (Next entrega string | string[]) */
export function sp(params: Record<string, string | string[] | undefined>, key: string): string | null {
  const v = params[key];
  return typeof v === 'string' ? v : Array.isArray(v) ? v[0] ?? null : null;
}
