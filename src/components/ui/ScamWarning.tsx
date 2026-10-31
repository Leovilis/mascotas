import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Aviso contra la estafa más común: "tengo a tu mascota, mandame plata para devolvértela".
 * variant="owner": para la familia que busca. variant="finder": para quien contacta a alguien que dice haberla visto.
 */
export function ScamWarning({ variant = 'owner', className }: { variant?: 'owner' | 'finder'; className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        'p-4 rounded-2xl border-2 border-amber-300 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-950 dark:text-amber-100 space-y-2',
        className
      )}
    >
      <p className="flex items-center gap-2 font-black uppercase tracking-wide text-amber-800 dark:text-amber-300">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        Cuidado con las estafas
      </p>
      <ul className="space-y-1 list-disc pl-5 leading-relaxed">
        {variant === 'owner' ? (
          <>
            <li><strong>Nunca transfieras dinero por adelantado</strong> para que te devuelvan a tu mascota.</li>
            <li>Pedí una <strong>foto actual o una videollamada</strong> con algo que solo vos conozcas (una mancha, el collar, cómo responde a su nombre).</li>
            <li>Encontrate en un <strong>lugar público</strong> y de día, o en una veterinaria. Si podés, andá acompañado.</li>
            <li>Los avistamientos <strong>“Sin confirmar”</strong> los cargó cualquier vecino: verificálos antes de moverte.</li>
          </>
        ) : (
          <>
            <li>La familia <strong>nunca debería pedirte dinero</strong>, y vos tampoco a ella: esta red es solidaria.</li>
            <li>Si alguien te pide datos bancarios o un pago, <strong>denunciá la publicación</strong>.</li>
          </>
        )}
      </ul>
    </div>
  );
}
