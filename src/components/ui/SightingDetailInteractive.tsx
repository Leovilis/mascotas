'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  Eye, 
  MessageCircle, 
  Share2, 
  MapPin, 
  Clock, 
  Maximize2, 
  X, 
  ChevronLeft,
  Navigation,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Compass,
  UserCheck,
  Phone
} from 'lucide-react';
import { 
  formatTimeAgo, 
  formatDate, 
  parseGeoLocation,
  capitalizeFirst,
  capitalizeWords
} from '@/lib/utils';
import { useRegion } from '@/components/region/RegionProvider';
import { regionForPoint } from '@/config/region-geo';
import { NearbyPartners } from '@/components/partners/NearbyPartners';
import { ScamWarning } from '@/components/ui/ScamWarning';
import { ReportFlagButton } from '@/components/ui/ReportFlagButton';
import { SightingOwnerActions, SightingStatusBadge } from '@/components/ui/SightingReview';

// Cargar mapa dinámico sin SSR
const MiniLeafletMap = dynamic(
  () => import('@/components/map/MiniLocationMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-64 w-full bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 text-xs animate-pulse">
        Cargando mapa interactivo...
      </div>
    )
  }
);

interface SightingDetailProps {
  sighting: any;
}

export default function SightingDetailInteractive({ sighting }: SightingDetailProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { region: viewerRegion } = useRegion();
  const parsedLoc = parseGeoLocation(sighting.location);
  // La provincia sale de la ubicación del avistamiento (no de la del visitante)
  const region = regionForPoint(parsedLoc?.latitude, parsedLoc?.longitude, viewerRegion);
  const loc = parsedLoc || { latitude: region.center.lat, longitude: region.center.lng };
  const lostReport = sighting.lost_report;
  const linkedPet = lostReport?.pet;
  const ownerProfile = lostReport?.profile;

  const [sightingStatus, setSightingStatus] = useState<string>(sighting.status || 'PENDING');
  const isHolding = sighting.is_holding === true || (typeof sighting.description === 'string' && (sighting.description.includes('EN TRÁNSITO') || sighting.description.includes('🏠')));

  const photo = sighting.photo_url;
  const formattedDate = formatDate(sighting.sighting_date);
  const timeAgo = formatTimeAgo(sighting.sighting_date);

  const ownerPhone = lostReport?.contact_phone || ownerProfile?.phone || '';
  const cleanOwnerPhone = ownerPhone.replace(/[^0-9]/g, '');
  const ownerName = lostReport?.contact_name || ownerProfile?.full_name || 'Familia';
  const petName = capitalizeWords(linkedPet?.name || 'la mascota');

  // Extraer teléfono y contacto de quien reportó el avistamiento / tránsito
  const reporterPhoneMatch = typeof sighting.description === 'string' 
    ? (
        sighting.description.match(/(?:Contacto \/ WhatsApp:|WhatsApp:|Teléfono:|Tel:|Celular:|Cel:|📞)\s*([0-9+\s\-()]{6,25})/i) ||
        sighting.description.match(/(?:(?:280|549280|\+549280)\s*[\d\s\-]{6,12})/i)
      )
    : null;
  const rawReporterPhone = sighting.contact_phone || (reporterPhoneMatch ? (reporterPhoneMatch[1] || reporterPhoneMatch[0]).trim() : '') || sighting.profile?.phone || '';
  const cleanReporterPhone = rawReporterPhone.replace(/[^0-9]/g, '');

  const reporterNameMatch = typeof sighting.description === 'string'
    ? sighting.description.match(/(?:Reportado por:|👤)\s*([^\n\r]+)/i)
    : null;
  const reporterName = sighting.reporter_name || (reporterNameMatch ? reporterNameMatch[1].trim() : '') || 'Vecino solidario';

  const whatsappMessage = `¡Hola! Vi el reporte de avistamiento de *${petName}* en ${region.mainCity}:\n📍 *Ubicación:* ${capitalizeWords(sighting.approximate_address)}\n🕒 *Fecha/Hora:* ${formattedDate} (${timeAgo})\n📝 *Detalle:* ${capitalizeFirst(sighting.description)}\n\nPodés ver la ficha aquí: ${typeof window !== 'undefined' ? window.location.href : ''}`;

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${isHolding ? '🏠 En Tránsito' : '🟡 Avistamiento'}: ${capitalizeWords(sighting.approximate_address)} — ${region.brandName}`,
        text: `Reporte de mascota en ${region.mainCity} (${capitalizeWords(sighting.approximate_address)}, ${timeAgo}). Mirá los detalles y fotos:`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Barra superior de navegación */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <Link 
          href="/mapa"
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors bg-white dark:bg-zinc-900 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver al Mapa</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? '¡Copiado!' : 'Compartir'}</span>
          </button>
        </div>
      </div>

      {/* Tarjeta Principal */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xl shadow-zinc-200/40 dark:shadow-none space-y-6">
        
        {/* Encabezado con Badge de Avistamiento / En Tránsito */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-5">
          <div className="space-y-1.5">
            {isHolding ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-300 dark:border-emerald-800 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>🏠 En Tránsito / A Resguardo</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-300 dark:border-amber-800/80">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <span>🐾 Visto en la Vía Pública</span>
              </div>
            )}
            {sighting.lost_report_id && (
              <div className="flex flex-wrap items-center gap-2">
                <SightingStatusBadge status={sightingStatus} />
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
              {isHolding 
                ? (linkedPet?.name ? `${capitalizeWords(linkedPet.name)} en Tránsito` : 'Mascota en Tránsito (A salvo)')
                : (linkedPet?.name ? `Vieron a ${capitalizeWords(linkedPet.name)}` : 'Mascota Avistada en la Calle')}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl">
            <Clock className={`w-3.5 h-3.5 ${isHolding ? 'text-emerald-500' : 'text-amber-500'}`} />
            <span>{timeAgo}</span>
          </div>
        </div>

        {/* Sección de Foto (con Lightbox al hacer click) */}
        {photo ? (
          <div className="relative group rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-200 dark:border-zinc-800 max-h-[420px] flex items-center justify-center shadow-inner">
            <img 
              src={photo} 
              alt="Foto del avistamiento" 
              className="w-full h-full max-h-[420px] object-contain cursor-zoom-in group-hover:scale-102 transition-transform duration-300"
              onClick={() => setLightboxOpen(true)}
            />
            <button
              onClick={() => setLightboxOpen(true)}
              className="absolute bottom-3 right-3 bg-black/75 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Ver foto completa</span>
            </button>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center mx-auto text-xl">
              👀
            </div>
            <p className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
              Avistamiento testimonial directo
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 max-w-md mx-auto">
              El vecino reportó el avistamiento sin fotografía en el momento. Los detalles visuales y de dirección se detallan a continuación.
            </p>
          </div>
        )}

        {/* Banner Vinculado a Mascota Perdida (Si corresponde) */}
        {lostReport && linkedPet && (
          <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-400 dark:border-amber-600/60 space-y-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-900 dark:text-amber-300 tracking-wider">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Avistamiento vinculado a búsqueda activa</span>
            </div>

            <div className="flex items-center gap-4 bg-white dark:bg-zinc-900/90 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-sm">
              {linkedPet.photos?.[0] ? (
                <img 
                  src={linkedPet.photos[0]} 
                  alt={linkedPet.name} 
                  className="w-16 h-16 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-2xl shrink-0">
                  🐾
                </div>
              )}

              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-black text-base text-zinc-900 dark:text-white truncate">
                  {capitalizeWords(linkedPet.name)}
                </h3>
                <p className="text-xs text-zinc-500 truncate">
                  {capitalizeWords(linkedPet.breed || 'Mascota perdida')} • Se busca en {capitalizeWords(lostReport.approximate_address)}
                </p>
                <Link 
                  href={`/mascotas-perdidas/${lostReport.id}`}
                  className="inline-flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <span>Ver publicación original</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Contacto directo con el dueño */}
            {cleanOwnerPhone && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950 dark:text-emerald-200 bg-emerald-100/80 dark:bg-emerald-950/60 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>Teléfono del dueño ({ownerName}):</span>
                  </span>
                  <span className="font-mono font-black text-sm">{ownerPhone}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a 
                    href={`https://wa.me/${cleanOwnerPhone}?text=${encodeURIComponent(whatsappMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-95 text-center cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Avisar al Dueño por WhatsApp</span>
                  </a>
                  <a 
                    href={`tel:${cleanOwnerPhone}`}
                    className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 text-center cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Llamar al Dueño</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* La familia confirma o descarta este avistamiento (solo en el dispositivo con su código de gestión) */}
        {sighting.lost_report_id && (
          <SightingOwnerActions
            sightingId={sighting.id}
            lostReportId={sighting.lost_report_id}
            status={sightingStatus}
            onChange={setSightingStatus}
          />
        )}

        {/* Contacto Directo con quien lo Vio / Tiene en Tránsito */}
        {rawReporterPhone && <ScamWarning variant="owner" />}
        {rawReporterPhone && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-left space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                <Phone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Contacto de quien {isHolding ? 'lo tiene en tránsito' : 'lo vio'}: <strong>{reporterName}</strong></span>
              </div>
              <span className="text-sm font-black text-amber-950 dark:text-amber-200 font-mono">
                {rawReporterPhone}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <a 
                href={`https://wa.me/${cleanReporterPhone}?text=${encodeURIComponent(`Hola ${reporterName}! Te escribo por el reporte en ${region.brandName} de ${sighting.approximate_address}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all text-center cursor-pointer active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Escribir por WhatsApp</span>
              </a>
              <a 
                href={`tel:${rawReporterPhone.replace(/[^0-9+]/g, '')}`}
                className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all text-center cursor-pointer active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>Llamar por teléfono</span>
              </a>
            </div>
          </div>
        )}

        {/* Grilla de Datos Detallados */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Ubicación */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-zinc-500 dark:text-zinc-400">
              <MapPin className="w-4 h-4 text-amber-500" />
              <span>Lugar exacto / Esquina</span>
            </div>
            <p className="text-sm font-extrabold text-zinc-900 dark:text-white">
              {capitalizeWords(sighting.approximate_address || `${region.mainCity}, ${region.provinceName}`)}
            </p>
          </div>

          {/* Fecha y Hora */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-zinc-500 dark:text-zinc-400">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Momento del Avistamiento</span>
            </div>
            <p className="text-sm font-extrabold text-zinc-900 dark:text-white">
              {formattedDate}
            </p>
            <p className="text-xs text-zinc-500">
              Reportado {timeAgo}
            </p>
          </div>
        </div>

        {/* Descripción / Qué se vio */}
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-zinc-500 dark:text-zinc-400">
            <Compass className="w-4 h-4 text-amber-500" />
            <span>Detalle y dirección del animal</span>
          </div>
          <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed font-semibold">
            {capitalizeFirst(sighting.description || 'Sin descripción adicional.')}
          </p>
        </div>

        {/* Mini Mapa Interactivo de Ubicación del Avistamiento / Resguardo */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-zinc-900 dark:text-white">
              <Navigation className={`w-4 h-4 ${isHolding ? 'text-emerald-500' : 'text-amber-500'}`} />
              <span>{isHolding ? 'Punto de Resguardo en el Mapa' : 'Punto de Avistamiento en el Mapa'}</span>
            </div>

            <a 
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 text-xs font-extrabold ${isHolding ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} hover:underline cursor-pointer`}
            >
              <span>Abrir en Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/60">
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{capitalizeWords(sighting.approximate_address || `${region.mainCity}, ${region.provinceName}`)}</span>
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm h-64 w-full">
            <MiniLeafletMap 
              latitude={loc.latitude} 
              longitude={loc.longitude} 
              title={sighting.approximate_address} 
              isHolding={isHolding}
              type={isHolding ? 'found' : 'sighting'}
            />
          </div>
        </div>

        {/* Acciones Finales */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <Link
            href="/mapa"
            className="w-full sm:w-auto flex-1 py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs uppercase tracking-wider text-center shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Ver en el Mapa General de {region.provinceName}</span>
          </Link>
          
          <button
            onClick={handleShare}
            className="w-full sm:w-auto py-3.5 px-5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold text-xs uppercase tracking-wider text-center transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir</span>
          </button>
        </div>

        <div className="flex justify-end">
          <ReportFlagButton entityType="sighting" entityId={sighting.id} />
        </div>

        {/* Comercios amigos cercanos al avistamiento */}
        {parsedLoc && (
          <NearbyPartners
            region={region.slug}
            lat={parsedLoc.latitude}
            lng={parsedLoc.longitude}
            title={isHolding ? 'Veterinarias cerca (lectura de microchip)' : 'Veterinarias cerca del avistamiento'}
            subtitle="Pueden ayudar a identificar a la mascota o difundir el aviso entre sus clientes."
          />
        )}

      </div>

      {/* Lightbox / Visor de Foto Completa */}
      {lightboxOpen && photo && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-50 p-3 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-white transition-all cursor-pointer shadow-lg"
          >
            <X className="w-6 h-6" />
          </button>

          <div 
            className="relative max-w-4xl max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={photo} 
              alt="Foto completa del avistamiento" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>

          <p className="mt-4 text-xs font-bold text-zinc-400">
            Avistamiento en {sighting.approximate_address} • {formattedDate}
          </p>
        </div>
      )}

    </div>
  );
}
