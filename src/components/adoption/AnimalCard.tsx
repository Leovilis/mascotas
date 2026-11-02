import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  ANIMAL_STATUS_LABEL,
  AdoptionAnimal,
  SEX_LABEL,
  SIZE_LABEL,
  SPECIES_EMOJI,
} from '@/lib/adoption/types';

export function AnimalStatusBadge({ status, className }: { status: AdoptionAnimal['status']; className?: string }) {
  return (
    <span
      className={cn(
        'text-[10px] font-black uppercase px-2 py-0.5 rounded-full',
        status === 'AVAILABLE' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        status === 'RESERVED' && 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        status === 'ADOPTED' && 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
        className
      )}
    >
      {ANIMAL_STATUS_LABEL[status]}
    </span>
  );
}

export function AnimalCard({
  animal,
  href,
  subtitle,
  extra,
}: {
  animal: AdoptionAnimal;
  href: string;
  subtitle?: string | null;
  extra?: React.ReactNode;
}) {
  const facts = [SEX_LABEL[animal.sex] !== 'Sin dato' ? SEX_LABEL[animal.sex] : null, animal.age, animal.size ? SIZE_LABEL[animal.size] : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <Link
      href={href}
      className="group block rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-800">
        {animal.photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={animal.photos[0]} alt={animal.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">{SPECIES_EMOJI[animal.species]}</div>
        )}
        <AnimalStatusBadge status={animal.status} className="absolute top-2 left-2 shadow" />
      </div>
      <div className="p-3.5 space-y-1">
        <p className="font-black text-zinc-900 dark:text-white group-hover:text-emerald-600 flex items-center gap-1.5">
          <span>{SPECIES_EMOJI[animal.species]}</span> {animal.name}
        </p>
        {facts && <p className="text-xs text-zinc-500">{facts}</p>}
        {animal.neutered && <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">✓ Castrado/a</p>}
        {subtitle && <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">🏠 {subtitle}</p>}
        {extra}
      </div>
    </Link>
  );
}
