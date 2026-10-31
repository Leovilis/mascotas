'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Crosshair, MapPin, Search, Navigation, Loader2 } from 'lucide-react';
import { DEFAULT_REGION } from '@/config/regions';

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationChange: (lat: number, lng: number, street?: string, houseNumber?: string) => void;
  label?: string;
  helperText?: string;
}

export default function LocationPicker({
  initialLat = DEFAULT_REGION.center.lat,
  initialLng = DEFAULT_REGION.center.lng,
  onLocationChange,
  label = 'Ubicación en el mapa',
  helperText = 'Tocá el mapa o arrastrá el marcador hacia el lugar exacto. La calle y número se detectarán automáticamente.',
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Mantener referencia fresca a la función de callback para evitar stale closures
  const onLocationChangeRef = useRef(onLocationChange);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Obtener ÚNICAMENTE el nombre de la calle y número (sin barrios confusos ni chacras)
  const fetchAddressFromCoords = async (lat: number, lng: number): Promise<{ street: string; houseNumber: string } | null> => {
    try {
      setIsGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'es',
          },
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const addr = data.address || {};

      const road = addr.road || addr.pedestrian || addr.street || addr.footway || addr.path || addr.avenue || '';
      const houseNumber = addr.house_number || '';

      if (road) {
        const cleanRoad = road.split(',')[0].replace(/\s+/g, ' ').trim();
        return {
          street: cleanRoad,
          houseNumber: houseNumber ? houseNumber.trim() : '',
        };
      }

      if (data.display_name) {
        const firstPart = data.display_name
          .split(',')
          .filter((p: string) => !/chacra|parcela|lote|radio|barrio|b°|bº/i.test(p))[0]
          ?.trim();
        if (firstPart) {
          return { street: firstPart, houseNumber: '' };
        }
      }

      return null;
    } catch (e) {
      console.error('Error reverse geocoding:', e);
      return null;
    } finally {
      setIsGeocoding(false);
    }
  };

  const handlePositionChanged = async (lat: number, lng: number) => {
    setCoords({ lat, lng });

    // Notificar coordenadas inmediatamente
    onLocationChangeRef.current(lat, lng);

    // Obtener la calle y número exacto
    const addr = await fetchAddressFromCoords(lat, lng);
    if (addr) {
      onLocationChangeRef.current(lat, lng, addr.street, addr.houseNumber);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initPicker() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!mapRef.current && isMounted && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [coords.lat, coords.lng],
          zoom: 15,
        });

        // Capa pública y 100% gratuita de OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        const customPin = L.divIcon({
          html: `
            <div style="width: 28px; height: 38px; position: relative; cursor: grab; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.35));">
              <svg width="28" height="38" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Pin Body with Sharp Needle Tip at x=14, y=38 -->
                <path d="M14 0C6.268 0 0 6.268 0 14C0 22.5 11 34.5 14 38C17 34.5 28 22.5 28 14C28 6.268 21.732 0 14 0Z" fill="#E11D48"/>
                <!-- White inner badge -->
                <circle cx="14" cy="14" r="10" fill="#FFFFFF"/>
                <!-- Center point -->
                <circle cx="14" cy="14" r="5.5" fill="#E11D48"/>
              </svg>
            </div>
          `,
          className: 'picker-pin-wrapper',
          iconSize: [28, 38],
          iconAnchor: [14, 38],
          popupAnchor: [0, -38],
        });

        const marker = L.marker([coords.lat, coords.lng], {
          icon: customPin,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', (e: any) => {
          const newPos = e.target.getLatLng();
          handlePositionChanged(newPos.lat, newPos.lng);
        });

        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          handlePositionChanged(e.latlng.lat, e.latlng.lng);
        });

        markerRef.current = marker;
        mapRef.current = map;
      }
    }

    initPicker();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const setLocationDirect = (lat: number, lng: number) => {
    setCoords({ lat, lng });
    handlePositionChanged(lat, lng);
    if (mapRef.current && markerRef.current) {
      mapRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
      markerRef.current.setLatLng([lat, lng]);
    }
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización. Podés tocar el mapa para marcar el punto.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Solicitando ubicación al navegador...');

    // Intentar primero con configuración estándar (muy compatible con PCs y celulares)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setLocationStatus('📍 ¡Ubicación obtenida correctamente!');
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocationDirect(lat, lng);
        setTimeout(() => setLocationStatus(null), 3500);
      },
      (err) => {
        // Si falla con alta precisión, reintentar con baja precisión (WiFi/IP)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setIsLocating(false);
            setLocationStatus('📍 Ubicación aproximada obtenida.');
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setLocationDirect(lat, lng);
            setTimeout(() => setLocationStatus(null), 3500);
          },
          (secondErr) => {
            setIsLocating(false);
            if (secondErr.code === 1) {
              setLocationStatus('⚠️ Permiso denegado. Tocá el icono del candado en la barra de tu navegador para permitir la ubicación o seleccioná en el mapa.');
            } else {
              setLocationStatus('💡 No se pudo detectar GPS en esta PC. Podés mover el marcador en el mapa.');
            }
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-orange-500" />
          {label}
        </label>

        <div className="flex items-center gap-2">
          {isGeocoding && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Detectando calle...
            </span>
          )}

          <button
            type="button"
            onClick={handleUseGPS}
            disabled={isLocating}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            {isLocating ? 'Obteniendo GPS...' : 'Usar mi ubicación actual'}
          </button>
        </div>
      </div>

      {locationStatus && (
        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 text-xs animate-in fade-in">
          {locationStatus}
        </div>
      )}

      <p className="text-xs text-zinc-500">{helperText}</p>

      {/* Contenedor del Mapa */}
      <div className="relative w-full h-64 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        <div className="absolute bottom-2 left-2 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[11px] font-mono text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
          Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)}
        </div>
      </div>
    </div>
  );
}
