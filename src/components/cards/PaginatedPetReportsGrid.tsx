'use client';

import React, { useState, useEffect } from 'react';
import { LostReport, FoundReport } from '@/types';
import { PetReportCard } from '@/components/cards/PetReportCard';
import { 
  getNearbyLostReports, 
  getNearbyFoundReports, 
  getAllPublishedReports, 
  UnifiedReport, 
  parseCoordinates 
} from '@/services/reports.service';
import { calculateDistanceMeters, cn } from '@/lib/utils';
import { Loader2, ChevronDown, Sparkles, Filter } from 'lucide-react';
import { useRegion } from '@/components/region/RegionProvider';

interface PaginatedPetReportsGridProps {
  initialReports: (LostReport | FoundReport | UnifiedReport)[];
  type?: 'all' | 'lost' | 'found';
  chunkSize?: number;
  emptyMessage?: string;
  showFilters?: boolean;
}

export function PaginatedPetReportsGrid({
  initialReports,
  type = 'all',
  chunkSize = 6,
  emptyMessage = 'No hay publicaciones activas en este momento.',
  showFilters = true,
}: PaginatedPetReportsGridProps) {
  const { region } = useRegion();
  const [activeFilter, setActiveFilter] = useState<'all' | 'lost' | 'found'>(type);
  const [reports, setReports] = useState<(LostReport | FoundReport | UnifiedReport)[]>(initialReports);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialReports.length >= chunkSize);

  // Detectar ubicación GPS real del dispositivo del usuario con fallback
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      const applyLocation = (lat: number, lng: number) => {
        setUserLocation({ lat, lng });

        // Reordenar reportes existentes por distancia real al dispositivo
        setReports((prev) => {
          const withDist = prev.map((r) => {
            const isLost = ('report_type' in r && r.report_type === 'lost') || 'last_seen_date' in r;
            const coords = parseCoordinates(
              isLost ? (r as LostReport).last_seen_location : (r as FoundReport).found_location
            );
            const dist = calculateDistanceMeters(lat, lng, coords.latitude, coords.longitude);
            return { ...r, distance_meters: dist };
          });
          return withDist.sort((a, b) => (a.distance_meters || 0) - (b.distance_meters || 0));
        });
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => applyLocation(pos.coords.latitude, pos.coords.longitude),
        () => {
          navigator.geolocation.getCurrentPosition(
            (pos) => applyLocation(pos.coords.latitude, pos.coords.longitude),
            () => {},
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
          );
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    }
  }, []);

  // Cambiar de filtro de categoría (Todos / Perdidos / Encontrados)
  const handleFilterChange = async (newFilter: 'all' | 'lost' | 'found') => {
    if (newFilter === activeFilter && !isFilterLoading) return;
    setActiveFilter(newFilter);
    setIsFilterLoading(true);

    try {
      const refLat = userLocation?.lat || region.center.lat;
      const refLng = userLocation?.lng || region.center.lng;
      // radio 0: se listan todos los avisos de la provincia (la distancia solo se usa para ordenar)
      const freshBatch = await getAllPublishedReports(refLat, refLng, 0, newFilter, undefined, chunkSize, 0, region.slug);

      setReports(freshBatch);
      setHasMore(freshBatch.length >= chunkSize);
    } catch (err) {
      console.error('Error al cambiar filtro de mascotas:', err);
    } finally {
      setIsFilterLoading(false);
    }
  };

  // Cargar más publicaciones (Chunks de 6)
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      const currentOffset = reports.length;
      const refLat = userLocation?.lat || region.center.lat;
      const refLng = userLocation?.lng || region.center.lng;

      const newBatch = await getAllPublishedReports(
        refLat,
        refLng,
        0,
        activeFilter,
        undefined,
        chunkSize,
        currentOffset,
        region.slug
      );

      if (newBatch.length < chunkSize) {
        setHasMore(false);
      }

      if (newBatch.length > 0) {
        // Evitar duplicados por id
        setReports((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const filteredNew = newBatch.filter((r) => !existingIds.has(r.id));
          const combined = [...prev, ...filteredNew];
          if (userLocation) {
            return combined.sort((a, b) => (a.distance_meters || 0) - (b.distance_meters || 0));
          }
          return combined;
        });
      }
    } catch (err) {
      console.error('Error al cargar más publicaciones:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Barra de Filtros Rápidos (Todos, Perdidos, Encontrados) */}
      {showFilters && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => handleFilterChange('all')}
              disabled={isFilterLoading}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5',
                activeFilter === 'all'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm shadow-orange-600/30 scale-102'
                  : 'bg-orange-50/70 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-900/40 hover:bg-orange-100 dark:hover:bg-orange-900/50'
              )}
            >
              <span>🐾 Todos</span>
            </button>

            <button
              type="button"
              onClick={() => handleFilterChange('lost')}
              disabled={isFilterLoading}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5',
                activeFilter === 'lost'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30 scale-102'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40 hover:bg-rose-100'
              )}
            >
              <span>🚨 Perdidos</span>
            </button>

            <button
              type="button"
              onClick={() => handleFilterChange('found')}
              disabled={isFilterLoading}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5',
                activeFilter === 'found'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 scale-102'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40 hover:bg-emerald-100'
              )}
            >
              <span>🏠 Encontrados</span>
            </button>
          </div>

          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            Mostrando <span className="font-bold text-zinc-800 dark:text-zinc-200">{reports.length}</span> publicaciones
          </span>
        </div>
      )}

      {/* Indicador de carga de filtro */}
      {isFilterLoading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500" />
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Cargando publicaciones...
          </p>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-2">
          <span className="text-3xl">🐾</span>
          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            {emptyMessage}
          </p>
          <p className="text-xs text-zinc-500">
            Sé el primero en reportar una mascota para ayudar a la comunidad.
          </p>
        </div>
      ) : (
        <>
          {/* Grid de Cards (Carga en Chunks de 6) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
              <PetReportCard key={report.id} report={report} userLocation={userLocation} />
            ))}
          </div>

          {/* Botón Ver Más (+6 Chunks) */}
          {hasMore && (
            <div className="flex flex-col items-center justify-center pt-4 space-y-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-700 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/25 hover:shadow-orange-600/35 transition-all transform active:scale-95 cursor-pointer disabled:opacity-60"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cargando 6 más...</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                    <span>Ver más publicaciones (+{chunkSize})</span>
                  </>
                )}
              </button>
              <span className="text-[10px] text-zinc-400 font-medium">
                Carga optimizada en paquetes de {chunkSize} para máxima velocidad
              </span>
            </div>
          )}
        </>
      )}

    </div>
  );
}

