'use client';

import React, { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { HelpCircle } from 'lucide-react';
import { useRegion } from '@/components/region/RegionProvider';

export function InteractiveTour() {
  const { region } = useRegion();
  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: '¡Entendido! Terminar tutorial',
      steps: [
        {
          element: '#tour-brand',
          popover: {
            title: `🐾 ¡Bienvenido a ${region.brandName}!`,
            description: `Esta es la red comunitaria geolocalizada para reunir mascotas perdidas con sus familias en ${region.coverageText}. Te mostramos cómo funciona en 1 minuto.`,
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-btn-lost',
          popover: {
            title: '🚨 Perdí mi mascota (Búsqueda Activa)',
            description: 'Si se extravió tu perro o gato, hacé clic acá para publicar su foto, rasgos y la zona exacta donde se vio por última vez.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#tour-btn-found',
          popover: {
            title: '🟢 Encontré una mascota (En Tránsito)',
            description: 'Si rescataste un animal y lo estás cuidando temporalmente en tu casa, publicalo acá para hallar a su dueño.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#tour-btn-sighting',
          popover: {
            title: '🟡 Vi una mascota en la calle (Avistamiento)',
            description: 'Si viste un animal deambulando en la vía pública, informá el lugar y la hora en 30 segundos para orientar la búsqueda sin necesidad de retenerlo.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#tour-btn-map',
          popover: {
            title: '🗺️ Mapa Interactivo en Tiempo Real',
            description: `Explorá todos los pines geolocalizados de ${region.provinceName} (Perdidas 🔴, Encontradas 🟢 y Avistamientos 🟡) filtrados por cercanía.`,
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#tour-nav-my-reports',
          popover: {
            title: '📋 Mis Reportes',
            description: 'Tu celular o navegador recuerda tus publicaciones creadas para que puedas editarlas o marcar "¡Ya la encontré! ❤️" cuando regrese a casa.',
            side: 'bottom',
            align: 'end',
          },
        },
      ],
      onDestroyed: () => {
        localStorage.setItem('mascotas_tour_completed', 'true');
      },
    });

    driverObj.drive();
  };

  useEffect(() => {
    // Verificar si ya vio el tour la primera vez
    const hasSeenTour = localStorage.getItem('mascotas_tour_completed');
    if (!hasSeenTour) {
      // Breve delay para asegurar que el DOM esté montado
      const timer = setTimeout(() => {
        startTour();
      }, 900);
      return () => clearTimeout(timer);
    }
    // Solo se ejecuta una vez al montar (el tour toma la provincia actual en ese momento)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      onClick={startTour}
      title="Ver tutorial guiado interactivo"
      aria-label="Ver tutorial interactivo"
      className="fixed bottom-20 md:bottom-6 right-4 z-40 p-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-xl hover:shadow-orange-600/30 flex items-center gap-1.5 text-xs font-bold transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
    >
      <HelpCircle className="w-4 h-4" />
      <span className="hidden sm:inline">¿Cómo funciona? Tour</span>
    </button>
  );
}
