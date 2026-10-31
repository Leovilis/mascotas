'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { MapMarkerItem } from '@/types';
import { getSpeciesEmoji, formatTimeAgo, capitalizeWords } from '@/lib/utils';
import { Crosshair, Filter, Layers, Navigation } from 'lucide-react';
import { DEFAULT_REGION } from '@/config/regions';

interface InteractiveMapProps {
  markers?: MapMarkerItem[];
  center?: [number, number]; // [lat, lng]
  zoom?: number;
  onMarkerSelect?: (marker: MapMarkerItem) => void;
  selectedMarkerId?: string | null;
  height?: string;
  isLoading?: boolean;
}

export default function InteractiveMap({
  markers = [],
  center = [DEFAULT_REGION.center.lat, DEFAULT_REGION.center.lng], // centro de la región por defecto
  zoom = 14,
  onMarkerSelect,
  selectedMarkerId,
  height = '500px',
  isLoading = false,
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  const [activeFilter, setActiveFilter] = useState<'all' | 'lost' | 'found' | 'sighting'>('all');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Inicializar mapa de Leaflet
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!leafletMapRef.current && isMounted && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: center,
          zoom: zoom,
          zoomControl: false,
        });

        // Capa pública y 100% gratuita de OpenStreetMap (sin API Key ni marcas de agua)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);
        leafletMapRef.current = map;
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  const markerInstancesRef = useRef<Map<string, any>>(new Map());
  const onMarkerSelectRef = useRef(onMarkerSelect);
  useEffect(() => {
    onMarkerSelectRef.current = onMarkerSelect;
  }, [onMarkerSelect]);

  // Actualizar marcadores en el mapa
  useEffect(() => {
    async function updateMarkers() {
      if (!leafletMapRef.current || !markersLayerRef.current) return;
      const L = (await import('leaflet')).default;

      markersLayerRef.current.clearLayers();
      markerInstancesRef.current.clear();

      const filtered = markers.filter(
        (m) => activeFilter === 'all' || m.marker_type === activeFilter
      );

      filtered.forEach((m) => {
        let colorBg = 'bg-rose-500';
        let borderColor = 'border-rose-600';
        let badgeText = '🔴 PERDIDO';
        if (m.marker_type === 'found' || m.is_holding) {
          colorBg = 'bg-emerald-500';
          borderColor = 'border-emerald-600';
          badgeText = '🏠 EN TRÁNSITO';
        } else if (m.marker_type === 'sighting') {
          colorBg = 'bg-amber-500';
          borderColor = 'border-amber-600';
          badgeText = '🐾 VISTO EN LA CALLE';
        }

        const emoji = m.is_holding ? '🏠' : getSpeciesEmoji(m.species);

        const customHtml = `
          <div style="width: 32px; height: 40px; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; cursor: pointer;">
            <div class="w-8 h-8 rounded-xl ${colorBg} border-2 border-white shadow-lg flex items-center justify-center text-white text-base transition-transform duration-200 hover:scale-110 active:scale-95">
              <span>${emoji}</span>
            </div>
            <div class="w-2.5 h-2.5 border-r-2 border-b-2 border-white transform rotate-45 -mt-1 ${colorBg}"></div>
          </div>
        `;

        const icon = L.divIcon({
          html: customHtml,
          className: 'custom-map-marker',
          iconSize: [32, 40],
          iconAnchor: [16, 40],
          popupAnchor: [0, -36],
        });

        const marker = L.marker([m.latitude, m.longitude], { icon }).addTo(
          markersLayerRef.current
        );

        markerInstancesRef.current.set(m.marker_id, marker);

        marker.on('click', () => {
          if (onMarkerSelectRef.current) {
            onMarkerSelectRef.current(m);
          }
        });

        // Popup interactivo moderno y completo
        const isLostPet = m.marker_type === 'lost';
        const isSighting = m.marker_type === 'sighting';
        const sightingUrl = `/publicar/avistamiento?reportId=${m.marker_id}&petName=${encodeURIComponent(m.title.replace(' (Perdida)', ''))}`;
        const detailUrl = m.detail_url || (isSighting 
          ? `/mascota-avistada/${m.marker_id}` 
          : m.marker_type === 'found' 
            ? `/mascotas-encontradas/${m.marker_id}` 
            : `/mascotas-perdidas/${m.marker_id}`);

        const popupContent = `
          <div style="min-width: 210px; max-width: 250px; font-family: system-ui, -apple-system, sans-serif; padding: 2px;">
            ${
              m.photo_url
                ? `<div style="position: relative; width: 100%; height: 125px; border-radius: 12px; overflow: hidden; margin-bottom: 8px; background-color: #f4f4f5;">
                    <img src="${m.photo_url}" alt="${m.title}" style="width: 100%; height: 100%; object-fit: cover;" />
                    <span style="position: absolute; top: 6px; left: 6px; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 6px; color: white; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px);">
                      ${badgeText}
                    </span>
                   </div>`
                : `<span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold ${colorBg} text-white mb-2">
                    ${badgeText}
                   </span>`
            }
            <div style="margin-bottom: 8px;">
              <h4 style="font-weight: 800; font-size: 15px; margin: 0; color: #18181b; line-height: 1.2;">${m.title}</h4>
              ${
                m.approximate_address
                  ? `<p style="font-size: 12px; font-weight: 700; color: #27272a; margin: 4px 0 2px 0; display: flex; align-items: flex-start; gap: 4px; line-height: 1.3;">
                      <span style="color: #ea580c; flex-shrink: 0;">📍</span>
                      <span>${capitalizeWords(m.approximate_address)}</span>
                     </p>`
                  : ''
              }
              <p style="font-size: 11px; color: #71717a; margin: 3px 0 0 0; display: flex; align-items: center; gap: 4px; font-weight: 500;">
                <span>⏱️</span>
                <span>${isLostPet ? 'Se perdió' : isSighting ? 'Visto' : 'Encontrado'} ${formatTimeAgo(m.report_date)}</span>
              </p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
              <a href="${detailUrl}" style="display: block; width: 100%; text-align: center; background-color: #18181b; color: #ffffff; font-size: 12px; font-weight: 700; padding: 8px 10px; border-radius: 10px; text-decoration: none; transition: background-color 0.2s;">
                ${isSighting ? 'Ver Ficha de Avistamiento' : 'Ver Ficha Completa'}
              </a>
              ${
                isLostPet
                  ? `<a href="${sightingUrl}" style="display: block; width: 100%; text-align: center; background-color: #fbbf24; color: #18181b; font-size: 11px; font-weight: 800; padding: 6px 10px; border-radius: 10px; text-decoration: none; border: 1px solid #f59e0b;">
                      🟡 ¿La viste? Reportar avistamiento
                     </a>`
                  : ''
              }
            </div>
          </div>
        `;
        marker.bindPopup(popupContent, { 
          maxWidth: 270, 
          className: 'custom-leaflet-popup',
          autoPan: true,
          autoPanPadding: [20, 20]
        });
      });
    }

    updateMarkers();
  }, [markers, activeFilter]);

  // Si selectedMarkerId cambia externamente, abrir popup y centrar
  useEffect(() => {
    if (!selectedMarkerId || !leafletMapRef.current || !markerInstancesRef.current) return;
    const marker = markerInstancesRef.current.get(selectedMarkerId);
    if (marker && leafletMapRef.current.hasLayer && leafletMapRef.current.hasLayer(marker)) {
      if (!marker.isPopupOpen()) {
        marker.openPopup();
      }
      leafletMapRef.current.panTo(marker.getLatLng(), { animate: true });
    }
  }, [selectedMarkerId]);

  // Centrar en ubicación del usuario (GPS con fallback inteligente)
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está soportada en tu navegador');
      return;
    }
    setIsLocating(true);

    const applyLocation = async (lat: number, lng: number) => {
      setIsLocating(false);
      setUserLocation([lat, lng]);

      if (leafletMapRef.current) {
        const L = (await import('leaflet')).default;
        leafletMapRef.current.flyTo([lat, lng], 15, { duration: 1.5 });

        // Marcador de usuario con pulso
        const userIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-blue-400 opacity-75"></span>
              <div class="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center text-white">
                <div class="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
          `,
          className: 'user-gps-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        L.marker([lat, lng], { icon: userIcon }).addTo(markersLayerRef.current);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyLocation(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        // Reintentar con baja precisión (WiFi/IP) para PCs
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            applyLocation(pos.coords.latitude, pos.coords.longitude);
          },
          (err) => {
            setIsLocating(false);
            if (err.code === 1) {
              alert('Permiso de ubicación denegado. Podés habilitarlo tocando el candado de la barra de direcciones o navegar el mapa manualmente.');
            } else {
              alert('No se pudo detectar sensor GPS en este dispositivo. Podés explorar el mapa desplazándote con el mouse o dedo.');
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    );
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800" style={{ height }}>
      {/* Contenedor Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Loading Indicator */}
      {isLoading && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 animate-in fade-in zoom-in-95">
          <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Buscando mascotas en el mapa...</span>
        </div>
      )}

      {/* Barra de Filtros Flotante */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto z-10 flex items-center gap-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-1.5 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800 overflow-x-auto max-w-[calc(100%-24px)] no-scrollbar">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
            activeFilter === 'all'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span>Todos</span>
          <span className="opacity-80">({isLoading ? '...' : markers.length})</span>
        </button>
        <button
          onClick={() => setActiveFilter('lost')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
            activeFilter === 'lost'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          Perdidas 🔴
        </button>
        <button
          onClick={() => setActiveFilter('sighting')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
            activeFilter === 'sighting'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Vistos en la calle 🐾
        </button>
        {markers.some((m) => m.marker_type === 'found' || m.is_holding) && (
          <button
            onClick={() => setActiveFilter('found')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
              activeFilter === 'found'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            En Tránsito 🏠
          </button>
        )}
      </div>


      {/* Botón GPS Mi Ubicación */}
      <button
        onClick={handleLocateMe}
        disabled={isLocating}
        aria-label="Usar mi ubicación GPS"
        className="absolute bottom-20 right-3 z-10 w-11 h-11 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95 transition-all"
      >
        <Crosshair className={`w-5 h-5 text-blue-600 dark:text-blue-400 ${isLocating ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
