import React from 'react';
import Link from 'next/link';
import type { Reunion } from '@/lib/reunions';
import { getSpeciesEmoji, capitalizeWords } from '@/lib/utils';

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export function ReunionCard({ r }: { r: Reunion }) {
  const days =
    r.days === null ? null : r.days === 0 ? 'el mismo día' : r.days === 1 ? 'después de 1 día' : `después de ${r.days} días`;
  return (
    <Link
      href={`/mascotas-perdidas/${r.id}`}
      className="group block rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-zinc-900 hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-800">
        {r.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.photo} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">{getSpeciesEmoji(r.species)}</div>
        )}
        <span className="absolute top-2 left-2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow">
          🏠 En casa
        </span>
      </div>
      <div className="p-3.5 space-y-0.5">
        <p className="font-black text-zinc-900 dark:text-white group-hover:text-emerald-600">
          {getSpeciesEmoji(r.species)} {capitalizeWords(r.name)}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {r.type === 'lost' ? 'Volvió a casa' : 'Encontró a su familia'} el {fmt(r.reunited_at)}
          {days && <span className="text-zinc-500"> · {days}</span>}
        </p>
        {r.address && <p className="text-[11px] text-zinc-500 truncate">📍 {r.address}</p>}
      </div>
    </Link>
  );
}
