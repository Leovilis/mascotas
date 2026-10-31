'use client';

import React, { useEffect, useRef } from 'react';

interface MiniLocationMapProps {
  latitude: number;
  longitude: number;
  title?: string;
  isHolding?: boolean;
  type?: 'lost' | 'found' | 'sighting';
}

export default function MiniLocationMap({ 
  latitude, 
  longitude, 
  title, 
  isHolding = false,
  type = 'sighting'
}: MiniLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!isMounted || !mapContainerRef.current) return;

      // Destruir mapa previo si existe
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 16,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Determinación de color, sombra y emoji según el tipo
      const isLost = type === 'lost';
      const isFound = type === 'found' || isHolding;

      const markerColor = isLost ? '#ef4444' : isFound ? '#10b981' : '#f59e0b';
      const markerShadow = isLost ? 'rgba(239,68,68,0.5)' : isFound ? 'rgba(16,185,129,0.5)' : 'rgba(245,158,11,0.5)';
      const markerEmoji = isLost ? '🚨' : isFound ? '🏠' : '🐾';
      const circleFill = isLost ? '#f87171' : isFound ? '#34d399' : '#fbbf24';
      const circleRadius = isLost ? 140 : isFound ? 90 : 120;

      const customHtml = `
        <div style="width: 36px; height: 44px; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-start;">
          <div style="width: 34px; height: 34px; border-radius: 12px; background-color: ${markerColor}; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px ${markerShadow}; display: flex; align-items: center; justify-content: center; font-size: 16px; line-height: 30px; text-align: center;">
            ${markerEmoji}
          </div>
          <div style="width: 10px; height: 10px; background-color: ${markerColor}; border-right: 2.5px solid #ffffff; border-bottom: 2.5px solid #ffffff; transform: rotate(45deg); margin-top: -5px;"></div>
        </div>
      `;

      const icon = L.divIcon({
        html: customHtml,
        className: 'custom-sighting-map-marker',
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        popupAnchor: [0, -44],
      });

      const marker = L.marker([latitude, longitude], { icon }).addTo(map);
      if (title) {
        const subtitle = isLost 
          ? '🚨 Última ubicación de extravío' 
          : isFound 
          ? '🏠 Mascota en resguardo / tránsito' 
          : '🐾 Visto en la vía pública';
        marker.bindPopup(`<b>${title}</b><br/><span style="font-size: 11px;">${subtitle}</span>`);
      }

      // Círculo de área aproximada
      L.circle([latitude, longitude], {
        color: markerColor,
        fillColor: circleFill,
        fillOpacity: 0.15,
        radius: circleRadius,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, title, isHolding, type]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[250px] z-0" />;
}
