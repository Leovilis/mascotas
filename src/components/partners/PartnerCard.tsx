'use client';

import React from 'react';
import { AtSign, BadgeCheck, Clock, Globe, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPartnerCategory, PartnerBusiness } from '@/types/partners';
import { onlyDigits, partnerInstagramUrl, partnerMapsUrl, partnerWhatsappUrl } from '@/services/partners.service';

function formatKm(m: number | null) {
  if (m === null || m === undefined) return null;
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

export function PartnerCard({
  partner,
  compact = false,
  whatsappText,
}: {
  partner: PartnerBusiness;
  compact?: boolean;
  whatsappText?: string;
}) {
  const cat = getPartnerCategory(partner.category);
  const featured = partner.plan === 'destacado';
  const wa = partnerWhatsappUrl(partner, whatsappText);
  const ig = partnerInstagramUrl(partner.instagram);
  const tel = onlyDigits(partner.phone);
  const dist = formatKm(partner.distance_meters);

  const btn =
    'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors border';

  return (
    <article
      className={cn(
        'rounded-2xl border bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-xs',
        featured
          ? 'border-orange-300 dark:border-orange-800/70 ring-1 ring-orange-200/60 dark:ring-orange-900/40'
          : 'border-zinc-200 dark:border-zinc-800'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 shrink-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center text-2xl">
          {partner.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={partner.logo_url} alt={`Logo de ${partner.name}`} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span aria-hidden>{cat.emoji}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white truncate">{partner.name}</h3>
            {featured && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-[10px] font-black uppercase">
                <BadgeCheck className="w-3 h-3" /> Comercio amigo
              </span>
            )}
            {partner.is_24h && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                <Clock className="w-3 h-3" /> 24 hs
              </span>
            )}
          </div>
          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            {cat.emoji} {cat.singular}
            {dist && <span> · a {dist}</span>}
          </p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-1">
            <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
            <span>
              {partner.address}
              {partner.city ? `, ${partner.city}` : ''}
            </span>
          </p>
        </div>
      </div>

      {!compact && partner.description && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{partner.description}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={cn(btn, 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white')}>
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>
        )}
        {tel && (
          <a href={`tel:${tel}`} className={cn(btn, 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800')}>
            <Phone className="w-3.5 h-3.5" /> Llamar
          </a>
        )}
        <a href={partnerMapsUrl(partner)} target="_blank" rel="noopener noreferrer" className={cn(btn, 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800')}>
          <Navigation className="w-3.5 h-3.5" /> Cómo llegar
        </a>
        {!compact && ig && (
          <a href={ig} target="_blank" rel="noopener noreferrer" className={cn(btn, 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800')}>
            <AtSign className="w-3.5 h-3.5" /> Instagram
          </a>
        )}
        {!compact && partner.website && (
          <a href={partner.website} target="_blank" rel="noopener noreferrer" className={cn(btn, 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800')}>
            <Globe className="w-3.5 h-3.5" /> Web
          </a>
        )}
      </div>
    </article>
  );
}
