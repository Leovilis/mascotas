'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Loader2, LocateFixed, MapPin, MessageCircle, Store } from 'lucide-react';
import { useRegion } from '@/components/region/RegionProvider';
import { PartnerCard } from '@/components/partners/PartnerCard';
import { getPartnerBusinesses } from '@/services/partners.service';
import { PARTNER_CATEGORIES, PartnerBusiness, PartnerCategory } from '@/types/partners';
import { cn } from '@/lib/utils';

const CONTACT_WHATSAPP = (process.env.NEXT_PUBLIC_PARTNER_CONTACT_WHATSAPP || '').replace(/\D/g, '');
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_PARTNER_CONTACT_EMAIL || '';

export default function ComerciosPage() {
  const { region } = useRegion();
  const [category, setCategory] = useState<PartnerCategory | 'all'>('all');
  const [all, setAll] = useState<PartnerBusiness[] | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // Se traen todos los de la provincia y se filtra por categoría en el navegador (son pocos)
  useEffect(() => {
    let cancelled = false;
    getPartnerBusinesses({ region: region.slug, lat: coords?.lat, lng: coords?.lng, limit: 200 }).then((list) => {
      if (!cancelled) setAll(list);
    });
    return () => {
      cancelled = true;
    };
  }, [region.slug, coords]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (all || []).forEach((p) => (c[p.category] = (c[p.category] || 0) + 1));
    return c;
  }, [all]);

  const visible = useMemo(
    () => (all || []).filter((p) => category === 'all' || p.category === category),
    [all, category]
  );

  const handleLocate = () => {
    if (!('geolocation' in navigator)) {
      setLocError('Tu navegador no permite obtener la ubicación.');
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError('No pudimos obtener tu ubicación.');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const contactHref = CONTACT_WHATSAPP
    ? `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(`Hola! Quiero sumar mi comercio a ${region.brandName} (${region.provinceName}).`)}`
    : CONTACT_EMAIL
      ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Sumar mi comercio a ${region.brandName}`)}`
      : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
          <Store className="w-7 h-7 text-orange-500" />
          Comercios Amigos en {region.provinceName}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
          Veterinarias, pet shops, guarderías y refugios que apoyan la red. Si encontraste una mascota,
          muchas veterinarias pueden <strong>leer su microchip gratis</strong> y ayudarte a ubicar a su familia.
        </p>
      </header>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors',
              category === 'all'
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
            )}
          >
            Todos {all ? `(${all.length})` : ''}
          </button>
          {PARTNER_CATEGORIES.filter((c) => counts[c.value]).map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors',
                category === c.value
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              )}
            >
              {c.emoji} {c.label} ({counts[c.value]})
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-800 dark:text-zinc-200 shrink-0 disabled:opacity-60"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4 text-orange-500" />}
          {coords ? 'Ordenados por cercanía' : 'Ordenar por cercanía'}
        </button>
      </div>
      {locError && <p className="text-xs text-red-600">{locError}</p>}

      {/* Listado */}
      {all === null ? (
        <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando comercios…
        </div>
      ) : visible.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-zinc-500">
          <MapPin className="w-6 h-6 mx-auto mb-2 text-orange-400" />
          Todavía no hay comercios amigos en {region.provinceName}. ¡El tuyo puede ser el primero!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((p) => (
            <PartnerCard key={p.id} partner={p} />
          ))}
        </div>
      )}

      {/* Sumá tu comercio */}
      {contactHref && (
        <section id="sumate" className="rounded-3xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30 border border-orange-200 dark:border-orange-900/60 p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-black text-zinc-900 dark:text-white">¿Tenés una veterinaria, pet shop o guardería?</h2>
          <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li className="flex gap-2"><BadgeCheck className="w-5 h-5 text-orange-500 shrink-0" /> Aparecé en este directorio y junto a las mascotas perdidas y encontradas cerca de tu local.</li>
            <li className="flex gap-2"><BadgeCheck className="w-5 h-5 text-orange-500 shrink-0" /> Plan destacado: primero en la lista, con tu logo y el sello de Comercio Amigo.</li>
            <li className="flex gap-2"><BadgeCheck className="w-5 h-5 text-orange-500 shrink-0" /> Carteles QR para tu vidriera y ayudá a que más mascotas vuelvan a casa.</li>
          </ul>
          <a
            href={contactHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm"
          >
            <MessageCircle className="w-4 h-4" /> Quiero sumar mi comercio
          </a>
        </section>
      )}
    </div>
  );
}
