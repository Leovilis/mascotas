'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, ChevronRight, Clock, MessageCircle, Navigation, Store } from 'lucide-react';
import { useRegion } from '@/components/region/RegionProvider';
import { getPartnerBusinesses, partnerMapsUrl, partnerWhatsappUrl } from '@/services/partners.service';
import { getPartnerCategory, PartnerBusiness } from '@/types/partners';

/**
 * Franja del inicio con los Comercios Amigos DESTACADOS de la provincia.
 * Es un beneficio exclusivo del plan Destacado. Si no hay ninguno, no se muestra.
 * El orden se mezcla en cada visita para que todos los destacados tengan la misma exposición.
 */
export function FeaturedPartnersStrip() {
  const { region } = useRegion();
  const [partners, setPartners] = useState<PartnerBusiness[]>([]);

  useEffect(() => {
    let cancelled = false;
    getPartnerBusinesses({ region: region.slug, limit: 200 }).then((list) => {
      if (cancelled) return;
      const featured = list.filter((p) => p.plan === 'destacado');
      for (let i = featured.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [featured[i], featured[j]] = [featured[j], featured[i]];
      }
      setPartners(featured.slice(0, 12));
    });
    return () => {
      cancelled = true;
    };
  }, [region.slug]);

  if (partners.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3" aria-label="Comercios amigos destacados">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-orange-500" />
            Comercios amigos de {region.provinceName}
          </h2>
          <p className="text-xs text-zinc-500">Veterinarias y comercios que apoyan la búsqueda de mascotas.</p>
        </div>
        <Link href="/comercios" className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline shrink-0">
          Ver todos <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {partners.map((p) => {
          const cat = getPartnerCategory(p.category);
          const wa = partnerWhatsappUrl(p);
          return (
            <article
              key={p.id}
              className="snap-start shrink-0 w-64 rounded-2xl border border-orange-200 dark:border-orange-900/60 bg-white dark:bg-zinc-900 p-3.5 space-y-2.5 shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-orange-50 dark:bg-zinc-800 overflow-hidden flex items-center justify-center text-2xl">
                  {p.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.logo_url} alt={`Logo de ${p.name}`} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span aria-hidden>{cat.emoji}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white truncate">{p.name}</h3>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {cat.singular}
                    {p.city ? ` · ${p.city}` : ''}
                  </p>
                  <div className="flex gap-1 mt-0.5">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-[9px] font-black uppercase">
                      <BadgeCheck className="w-3 h-3" /> Amigo
                    </span>
                    {p.is_24h && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase">
                        <Clock className="w-3 h-3" /> 24 hs
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                )}
                <a href={partnerMapsUrl(p)} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold">
                  <Navigation className="w-3.5 h-3.5" /> Cómo llegar
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
