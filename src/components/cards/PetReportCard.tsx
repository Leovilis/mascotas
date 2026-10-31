'use client';

import React from 'react';
import Link from 'next/link';
import { LostReport, FoundReport } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { 
  formatDistance, 
  formatTimeAgo, 
  getSpeciesEmoji, 
  getSpeciesLabel, 
  getSizeLabel,
  capitalizeFirst,
  capitalizeWords,
  calculateDistanceMeters,
  parseGeoLocation 
} from '@/lib/utils';
import { parseCoordinates, UnifiedReport } from '@/services/reports.service';
import { MapPin, Clock, Share2, Phone, MessageCircle } from 'lucide-react';

interface PetReportCardProps {
  report: LostReport | FoundReport | UnifiedReport;
  type?: 'lost' | 'found';
  userLocation?: { lat: number; lng: number } | null;
}

export function PetReportCard({ report, type, userLocation }: PetReportCardProps) {
  const isLost = type ? type === 'lost' : ('report_type' in report ? report.report_type === 'lost' : 'last_seen_date' in report);
  const lostRep = isLost ? (report as LostReport) : null;
  const foundRep = !isLost ? (report as FoundReport) : null;

  const rawName = report.pet?.name || (isLost ? 'Mascota perdida' : 'Mascota encontrada');
  const petName = capitalizeWords(rawName);
  const photo = report.pet?.photos?.[0] || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600';
  const eventDate = isLost ? (lostRep?.last_seen_date || report.created_at) : (foundRep?.found_date || report.created_at);
  const createdDate = report.created_at;
  const species = report.pet?.species || 'dog';
  const details = report.pet?.distinctive_features || report.description;

  // Extraer coordenadas de la mascota
  const petCoords = parseCoordinates(isLost ? lostRep?.last_seen_location : foundRep?.found_location);

  // Calcular distancia precisa con GPS del dispositivo si está disponible
  const computedDistance = userLocation
    ? calculateDistanceMeters(userLocation.lat, userLocation.lng, petCoords.latitude, petCoords.longitude)
    : report.distance_meters;

  const detailHref = isLost
    ? `/mascotas-perdidas/${report.id}`
    : `/mascotas-encontradas/${report.id}`;

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${detailHref}`;
    if (navigator.share) {
      navigator.share({
        title: `🐾 ${petName} en ${capitalizeWords(report.approximate_address)}`,
        text: `Ayudanos a difundir: ${capitalizeFirst(report.description)}`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('¡Enlace copiado al portapapeles para compartir en WhatsApp o Facebook!');
    }
  };

  return (
    <div className="group bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
      <Link href={detailHref} className="block">
        {/* Thumbnail Container */}
        <div className="relative aspect-16/11 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <img
            src={photo}
            alt={petName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />

          {/* Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
            <StatusBadge status={report.status} />
            <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs">
              <span>{getSpeciesEmoji(species)}</span>
              <span>{getSpeciesLabel(species)}</span>
            </span>
          </div>

          {/* Distance Badge (Calculado con GPS exacto) */}
          {computedDistance !== undefined && computedDistance !== null && (
            <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-orange-600/90 backdrop-blur-md text-white border border-orange-400/40 font-black text-xs shadow-md flex items-center gap-1">
              <MapPin className="w-3 h-3 text-white" />
              <span>{formatDistance(computedDistance)}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100 group-hover:text-orange-600 transition-colors line-clamp-1">
                {petName}
              </h3>
              {report.pet?.breed && (
                <p className="text-xs text-zinc-500 font-bold">{capitalizeWords(report.pet.breed)}</p>
              )}
            </div>
            <button
              onClick={handleShare}
              aria-label="Compartir publicación"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Location & Time */}
          <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-1.5 line-clamp-1">
              <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span className="font-bold text-zinc-700 dark:text-zinc-300">{capitalizeWords(report.approximate_address)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">{isLost ? 'Se extravió' : 'Encontrado'} {formatTimeAgo(eventDate)}</span>
                {createdDate && (
                  <span className="text-zinc-400 dark:text-zinc-500 text-[11px] ml-1">
                    • Pub. {formatTimeAgo(createdDate)}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Detalles / Rasgos Particulares */}
          {details && (
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 block mb-0.5 uppercase tracking-wide">
                Detalles / rasgos particulares:
              </span>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2 leading-relaxed font-semibold">
                {capitalizeFirst(details)}
              </p>
            </div>
          )}
        </div>
      </Link>

      {/* Botón de acción directa si es perdida: "¿Viste a [Nombre]?" */}
      {isLost && report.status === 'ACTIVE' && (
        <div className="p-3 pt-0">
          <Link
            href={`/publicar/avistamiento?reportId=${report.id}&petName=${encodeURIComponent(petName)}`}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all transform active:scale-98 text-center"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>¿Viste a {petName}? Aportar avistamiento</span>
          </Link>
        </div>
      )}
    </div>
  );
}
