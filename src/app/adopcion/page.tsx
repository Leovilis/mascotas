import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { HeartHandshake, Home, UserRound } from 'lucide-react';
import { getServerRegion } from '@/lib/region/server';
import { getSessionUser, listApprovedAssociations, listPublicAnimals } from '@/lib/adoption/server';
import { AnimalCard } from '@/components/adoption/AnimalCard';
import { sp } from '@/components/adoption/Notice';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { region } = await getServerRegion();
  return {
    title: `Adopción responsable en ${region.provinceName} | ${region.brandName}`,
    description: `Perros y gatos en adopción de refugios y asociaciones de ${region.provinceName}.`,
  };
}

const FILTERS = [
  { value: null, label: 'Todos' },
  { value: 'dog', label: '🐶 Perros' },
  { value: 'cat', label: '🐱 Gatos' },
  { value: 'other', label: '🐾 Otros' },
];

export default async function AdopcionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const species = sp(params, 'especie');
  const { region } = await getServerRegion();
  const [animals, associations, user] = await Promise.all([
    listPublicAnimals({ region: region.slug, species }),
    listApprovedAssociations(region.slug),
    getSessionUser(),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <HeartHandshake className="w-7 h-7 text-emerald-500" />
            Adopción en {region.provinceName}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Perros y gatos de refugios y asociaciones verificadas que buscan una familia. Elegí uno, mandá tu solicitud y la
            asociación se comunica con vos.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={user ? '/cuenta' : '/cuenta/ingresar?next=/adopcion'} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-sm font-bold">
            <UserRound className="w-4 h-4" /> {user ? 'Mi cuenta' : 'Ingresar'}
          </Link>
          <Link href="/adopcion/sumar-asociacion" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">
            <Home className="w-4 h-4" /> Soy refugio
          </Link>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Filtrar por especie">
        {FILTERS.map((f) => {
          const active = (f.value || null) === (species || null);
          return (
            <Link
              key={f.label}
              href={f.value ? `/adopcion?especie=${f.value}` : '/adopcion'}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-bold border',
                active ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {animals.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center space-y-2">
          <p className="text-4xl">🏡</p>
          <p className="font-bold text-zinc-800 dark:text-zinc-200">Todavía no hay animales en adopción en {region.provinceName}.</p>
          <p className="text-sm text-zinc-500">
            ¿Tenés un refugio o rescatás animales? <Link href="/adopcion/sumar-asociacion" className="font-bold text-emerald-600 underline">Sumá tu asociación</Link>, es gratis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {animals.map((a) => (
            <AnimalCard key={a.id} animal={a} href={`/adopcion/${a.id}`} subtitle={a.association.name} />
          ))}
        </div>
      )}

      {associations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-black text-zinc-900 dark:text-white">Refugios y asociaciones de {region.provinceName}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {associations.map((a) => (
              <Link key={a.id} href={`/adopcion/asociaciones/${a.slug}`} className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-500 transition-colors">
                <p className="font-black text-zinc-900 dark:text-white">🏠 {a.name}</p>
                <p className="text-xs text-zinc-500">{a.city}</p>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-2">{a.available} en adopción</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-900 dark:text-emerald-200 space-y-1.5">
        <p className="font-black">Adopción responsable</p>
        <p>Adoptar es un compromiso para toda la vida del animal: alimento, vacunas, castración, paseos y cuidado veterinario.</p>
        <p>Las asociaciones publicadas acá fueron revisadas por el equipo de {region.brandName}. Si algo te parece raro, avisanos.</p>
      </section>
    </div>
  );
}
