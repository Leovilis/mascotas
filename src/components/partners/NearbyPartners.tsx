'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Store } from 'lucide-react';
import { getPartnerBusinesses } from '@/services/partners.service';
import type { PartnerBusiness, PartnerCategory } from '@/types/partners';
import { PartnerCard } from './PartnerCard';

/**
 * Bloque "Veterinarias cerca de donde se perdió/encontró".
 * No se muestra nada si no hay comercios cargados en la zona (no ocupa lugar).
 */
export function NearbyPartners({
  region,
  lat,
  lng,
  title,
  subtitle,
  category = 'veterinaria',
  maxKm = 15,
  limit = 3,
  whatsappText,
}: {
  region: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  category?: PartnerCategory | null;
  maxKm?: number;
  limit?: number;
  whatsappText?: string;
}) {
  const [partners, setPartners] = useState<PartnerBusiness[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPartnerBusinesses({ region, category, lat, lng, maxKm, limit }).then((list) => {
      if (!cancelled) setPartners(list);
    });
    return () => {
      cancelled = true;
    };
  }, [region, category, lat, lng, maxKm, limit]);

  if (!partners || partners.length === 0) return null;

  return (
    <section className="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 shadow-xs">
      <div>
        <h4 className="text-xs font-black uppercase text-zinc-900 dark:text-white tracking-wider flex items-center gap-1.5">
          <Store className="w-4 h-4 text-orange-500" />
          <span>{title}</span>
        </h4>
        {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
      </div>
      <div className="space-y-2.5">
        {partners.map((p) => (
          <PartnerCard key={p.id} partner={p} compact whatsappText={whatsappText} />
        ))}
      </div>
      <Link href="/comercios" className="block text-center text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline">
        Ver todos los comercios amigos
      </Link>
    </section>
  );
}
