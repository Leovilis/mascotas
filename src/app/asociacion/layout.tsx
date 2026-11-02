import React from 'react';
import Link from 'next/link';
import { requireMyAssociation, db } from '@/lib/adoption/server';
import { ASSOCIATION_STATUS_LABEL } from '@/lib/adoption/types';
import { PanelNav } from '@/components/adoption/PanelNav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Panel de la asociación' };

export default async function AsociacionLayout({ children }: { children: React.ReactNode }) {
  const { association } = await requireMyAssociation();
  const { data: animals } = await db().from('adoption_animals').select('id').eq('association_id', association.id);
  const ids = (animals || []).map((a: { id: string }) => a.id);
  const { count } = ids.length
    ? await db().from('adoption_requests').select('id', { count: 'exact', head: true }).in('animal_id', ids).eq('status', 'PENDING')
    : { count: 0 };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <header className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Panel de la asociación</p>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">{association.name}</h1>
        </div>
        {association.status === 'APPROVED' && (
          <Link href={`/adopcion/asociaciones/${association.slug}`} className="text-sm font-bold text-emerald-600 underline">
            Ver página pública
          </Link>
        )}
      </header>
      {association.status !== 'APPROVED' && (
        <div
          className={`print:hidden p-4 rounded-2xl text-sm border ${
            association.status === 'PENDING'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
          }`}
        >
          <strong>{ASSOCIATION_STATUS_LABEL[association.status]}.</strong>{' '}
          {association.status === 'PENDING'
            ? 'Ya podés ir cargando tus animales: se van a mostrar al público apenas aprobemos la asociación.'
            : association.admin_notes || 'Tus animales no se muestran al público. Escribinos si creés que es un error.'}
        </div>
      )}
      <div className="print:hidden">
        <PanelNav pending={count ?? 0} />
      </div>
      {children}
    </div>
  );
}
