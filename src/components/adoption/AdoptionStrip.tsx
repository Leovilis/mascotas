import React from 'react';
import Link from 'next/link';
import { ChevronRight, HeartHandshake } from 'lucide-react';
import { listPublicAnimals } from '@/lib/adoption/server';
import { AnimalCard } from './AnimalCard';

/** Franja "En adopción" para la home (no se muestra si no hay animales en la provincia) */
export async function AdoptionStrip({ region, provinceName }: { region: string; provinceName: string }) {
  let animals: Awaited<ReturnType<typeof listPublicAnimals>> = [];
  try {
    animals = await listPublicAnimals({ region, includeReserved: false, limit: 4 });
  } catch {
    return null; // si la migración de adopción no se corrió todavía, la home sigue funcionando
  }
  if (animals.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
          <HeartHandshake className="w-6 h-6 text-emerald-500" /> Buscan familia en {provinceName}
        </h2>
        <Link href="/adopcion" className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 hover:underline">
          Ver todos en adopción <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {animals.map((a) => (
          <AnimalCard key={a.id} animal={a} href={`/adopcion/${a.id}`} subtitle={a.association.name} />
        ))}
      </div>
    </section>
  );
}
