'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/asociacion', label: 'Animales' },
  { href: '/asociacion/solicitudes', label: 'Solicitudes' },
  { href: '/asociacion/adopciones', label: 'Adopciones' },
  { href: '/asociacion/perfil', label: 'Datos de la asociación' },
];

export function PanelNav({ pending }: { pending: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto pb-1">
      {LINKS.map((l) => {
        const active = l.href === '/asociacion' ? pathname === '/asociacion' || pathname.startsWith('/asociacion/animales') : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'px-3.5 py-2 rounded-xl text-sm font-bold whitespace-nowrap',
              active ? 'bg-emerald-600 text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            )}
          >
            {l.label}
            {l.href === '/asociacion/solicitudes' && pending > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white">{pending}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
