import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { PartyPopper } from 'lucide-react';
import { getServerRegion } from '@/lib/region/server';
import { getRecentReunions, REUNION_WINDOW_DAYS } from '@/lib/reunions';
import { ReunionCard } from '@/components/reunions/ReunionCard';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { region } = await getServerRegion();
  return {
    title: `Reencuentros en ${region.provinceName} | ${region.brandName}`,
    description: `Mascotas que volvieron a casa en ${region.provinceName} en los últimos 3 meses gracias a la comunidad.`,
  };
}

export default async function ReencuentrosPage() {
  const { region } = await getServerRegion();
  const reunions = await getRecentReunions({ region: region.slug });
  const avgDays = (() => {
    const d = reunions.map((r) => r.days).filter((x): x is number => x !== null);
    return d.length ? Math.round(d.reduce((a, b) => a + b, 0) / d.length) : null;
  })();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
          <PartyPopper className="w-7 h-7 text-emerald-500" />
          Volvieron a casa
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
          Mascotas de {region.provinceName} que se reencontraron con su familia en los últimos {Math.round(REUNION_WINDOW_DAYS / 30)} meses. Cada
          avistamiento y cada vez que compartiste un aviso ayudó. 💚
        </p>
      </header>

      {reunions.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{reunions.length}</p>
            <p className="text-xs text-emerald-800 dark:text-emerald-400">reencuentros</p>
          </div>
          {avgDays !== null && (
            <div className="px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{avgDays} días</p>
              <p className="text-xs text-emerald-800 dark:text-emerald-400">en promedio hasta volver</p>
            </div>
          )}
        </div>
      )}

      {reunions.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center space-y-2">
          <p className="text-4xl">🏡</p>
          <p className="font-bold text-zinc-800 dark:text-zinc-200">Todavía no hay reencuentros en los últimos 3 meses en {region.provinceName}.</p>
          <p className="text-sm text-zinc-500">
            Si tu mascota volvió a casa, marcala como encontrada desde{' '}
            <Link href="/mis-reportes" className="font-bold text-emerald-600 underline">
              Mis Reportes
            </Link>{' '}
            para que aparezca acá.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {reunions.map((r) => (
            <ReunionCard key={`${r.type}-${r.id}`} r={r} />
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-500">
        ¿Tu mascota volvió? Entrá a <Link href="/mis-reportes" className="underline font-bold">Mis Reportes</Link> y tocá &quot;¡Ya la encontré!&quot;.
      </p>
    </div>
  );
}
