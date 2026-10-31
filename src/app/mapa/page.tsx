'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { getUnifiedMapData } from '@/services/reports.service';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { LostReport, MapMarkerItem, PetSpecies } from '@/types';
import { PetReportCard } from '@/components/cards/PetReportCard';
import { 
  Compass, 
  Filter, 
  MapPin, 
  Search, 
  SlidersHorizontal,
  ChevronDown,
  List,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useRegion } from '@/components/region/RegionProvider';
import { regionForPoint } from '@/config/region-geo';

// Dynamic import of InteractiveMap to avoid SSR issues with Leaflet window object
const InteractiveMap = dynamic(
  () => import('@/components/map/InteractiveMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-400 animate-pulse border border-zinc-200 dark:border-zinc-800">
        <Compass className="w-8 h-8 animate-spin text-orange-500 mr-2" />
        <span>Cargando mapa interactivo en tiempo real...</span>
      </div>
    ),
  }
);

function MapaInner() {
  const searchParams = useSearchParams();
  const urlId = searchParams.get('id');
  const urlLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
  const urlLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;
  const { region: userRegion } = useRegion();
  // Si el link apunta a una publicación puntual, usamos la provincia de esa publicación
  const region = urlLat && urlLng ? regionForPoint(urlLat, urlLng, userRegion) : userRegion;

  const [markers, setMarkers] = useState<MapMarkerItem[]>([]);
  const [lostReports, setLostReports] = useState<LostReport[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(urlId || null);
  const [reunitedCount, setReunitedCount] = useState<number>(0);
  const [speciesFilter, setSpeciesFilter] = useState<PetSpecies | 'all'>('all');
  const [radiusFilter, setRadiusFilter] = useState<number>(urlId ? 50000 : region.mapDefaultRadiusM);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (urlId) {
      setSelectedMarkerId(urlId);
    }
  }, [urlId]);

  useEffect(() => {
    let isMounted = true;
    async function loadData(showLoader = false) {
      if (showLoader && isMounted) setIsLoading(true);
      try {
        const centerLat = urlLat || region.center.lat;
        const centerLng = urlLng || region.center.lng;

        const { markers: markerData, lostReports: lostData, reunitedCount: countReunited } =
          await getUnifiedMapData(centerLat, centerLng, radiusFilter, speciesFilter, region.slug);

        if (isMounted) {
          setMarkers(markerData);
          setLostReports(lostData);
          setReunitedCount(countReunited);
        }
      } catch (err) {
        console.error('Error al cargar datos del mapa:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadData(true);

    // Suscripción en Tiempo Real con Supabase Realtime
    const supabase = createBrowserClient();
    const channel = supabase
      .channel('map-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lost_reports' }, () => {
        loadData(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'found_reports' }, () => {
        loadData(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sightings' }, () => {
        loadData(false);
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [speciesFilter, radiusFilter, urlLat, urlLng, region]);

  const handleMarkerSelect = React.useCallback((marker: MapMarkerItem) => {
    setSelectedMarkerId(marker.marker_id);
  }, []);

  const mapCenter: [number, number] = urlLat && urlLng 
    ? [urlLat, urlLng] 
    : [region.center.lat, region.center.lng];

  const mapZoom = urlLat && urlLng ? 16 : 14;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      
      {/* Header & Filtros Rápidos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <Compass className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" />
            Mapa Interactivo de Búsqueda
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs sm:text-sm text-zinc-500">
              Mascotas perdidas 🔴 y avistamientos en la vía pública 🟡 en {region.provinceName}.
            </p>
            {reunitedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-black shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {reunitedCount} mascotas encontradas y devueltas a casa ❤️
              </span>
            )}
          </div>
        </div>

        {/* Controles de Filtro por Especie y Radio */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Especie */}
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value as any)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold rounded-xl px-2.5 sm:px-3 py-2 text-zinc-700 dark:text-zinc-300 shadow-xs focus:outline-none cursor-pointer shrink-0"
          >
            <option value="all">Especies: Todas 🐾</option>
            <option value="dog">Perros 🐕</option>
            <option value="cat">Gatos 🐈</option>
            <option value="bird">Aves 🦜</option>
            <option value="rabbit">Conejos 🐇</option>
            <option value="other">Otros 🐾</option>
          </select>

          {/* Radio de Distancia */}
          <select
            value={radiusFilter}
            onChange={(e) => setRadiusFilter(Number(e.target.value))}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold rounded-xl px-2.5 sm:px-3 py-2 text-zinc-700 dark:text-zinc-300 shadow-xs focus:outline-none cursor-pointer shrink-0"
          >
            {region.mapRadiusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            {!region.mapRadiusOptions.some((opt) => opt.value === radiusFilter) && (
              <option value={radiusFilter}>{Math.round(radiusFilter / 1000)} km</option>
            )}
          </select>
        </div>
      </div>

      {/* Switcher Móvil: Mapa / Lista */}
      <div className="flex lg:hidden bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setMobileView('map')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            mobileView === 'map'
              ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Ver Mapa
        </button>
        <button
          type="button"
          onClick={() => setMobileView('list')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            mobileView === 'list'
              ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          Ver Lista ({isLoading ? '...' : lostReports.length})
        </button>
      </div>

      {/* Grid Principal: Mapa Grande + Panel Lateral de Reportes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Mapa Interactivo */}
        <div className={`lg:col-span-2 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
          <InteractiveMap
            key={region.slug}
            markers={markers}
            center={mapCenter}
            zoom={mapZoom}
            selectedMarkerId={selectedMarkerId}
            onMarkerSelect={handleMarkerSelect}
            height="520px"
            isLoading={isLoading}
          />
        </div>

        {/* Listado lateral sincronizado por proximidad */}
        <div className={`space-y-4 max-h-[580px] overflow-y-auto pr-1 ${mobileView === 'map' ? 'hidden lg:block' : 'block'}`}>
          <div className="sticky top-0 bg-zinc-50 dark:bg-zinc-950 pb-2 z-10 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <List className="w-4 h-4 text-orange-500" />
              <span>Publicaciones Cercanas ({isLoading ? '...' : lostReports.length})</span>
            </h3>
            {isLoading ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-500 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Buscando...</span>
              </span>
            ) : (
              <span className="text-xs text-zinc-400">Ordenadas por distancia</span>
            )}
          </div>

          <div className="space-y-4">
            {isLoading ? (
              /* Skeletons de carga suave */
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3"
                  >
                    <div className="w-full aspect-16/11 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                    <div className="space-y-2">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : lostReports.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                No hay reportes en el radio seleccionado.
              </div>
            ) : (
              lostReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => {
                    setSelectedMarkerId(report.id);
                    setMobileView('map');
                  }}
                  className={`cursor-pointer transition-all ${
                    selectedMarkerId === report.id ? 'ring-2 ring-orange-500 rounded-2xl' : ''
                  }`}
                >
                  <PetReportCard report={report} type="lost" />
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

function MapaWithRegion() {
  const { region } = useRegion();
  // key: al cambiar de provincia se reinician los filtros (radio, selección) del mapa
  return <MapaInner key={region.slug} />;
}

export default function MapaPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-[520px] bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-400">
          <Compass className="w-8 h-8 animate-spin text-orange-500 mr-2" />
          <span>Cargando mapa...</span>
        </div>
      }
    >
      <MapaWithRegion />
    </Suspense>
  );
}

