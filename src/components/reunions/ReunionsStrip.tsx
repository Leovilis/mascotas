import React from 'react';
import Link from 'next/link';
import { ChevronRight, PartyPopper } from 'lucide-react';
import { getRecentReunions } from '@/lib/reunions';
import { ReunionCard } from './ReunionCard';

/** Franja "Volvieron a casa" de la home: últimos reencuentros (3 meses). No se muestra si no hay. */
export async function ReunionsStrip({ region, provinceName }: { region: string; provinceName: string }) {
  const reunions = await getRecentReunions({ region, limit: 4 }).catch(() => []);
  if (reunions.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
          <PartyPopper className="w-6 h-6 text-emerald-500" /> Volvieron a casa en {provinceName}
        </h2>
        <Link href="/reencuentros" className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 hover:underline">
          Ver los reencuentros de los últimos 3 meses <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {reunions.map((r) => (
          <ReunionCard key={`${r.type}-${r.id}`} r={r} />
        ))}
      </div>
    </section>
  );
}
