import React from 'react';
import Link from 'next/link';
import { 
  ChevronRight,
  Compass,
  Sparkles
} from 'lucide-react';
import { getAllPublishedReports, getAdminStats } from '@/services/reports.service';
import { PaginatedPetReportsGrid } from '@/components/cards/PaginatedPetReportsGrid';
import { ParallaxHero } from '@/components/home/ParallaxHero';
import { getServerRegion } from '@/lib/region/server';
import { FeaturedPartnersStrip } from '@/components/partners/FeaturedPartnersStrip';

// La home depende de la provincia del visitante (cookie), por eso se renderiza por request.
export default async function HomePage() {
  const { region } = await getServerRegion();
  const [initialReports, stats] = await Promise.all([
    // radio 0 = sin límite de distancia: se muestran todos los avisos de la provincia
    getAllPublishedReports(region.center.lat, region.center.lng, 0, 'all', undefined, 6, 0, region.slug),
    getAdminStats(region.slug),
  ]);

  return (
    <div className="space-y-12 pb-16">
      
      {/* Hero Section con Paralaje Dinámico en Pantalla Completa (Mobile First) */}
      <ParallaxHero stats={stats} />

      {/* Comercios amigos destacados (beneficio del plan Destacado; no se muestra si no hay) */}
      <FeaturedPartnersStrip />

      {/* Grid Unificado de Publicaciones Recientes (Limitado a 6 inicial + carga de 6 en 6) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></span>
              Publicaciones Recientes en {region.provinceName}
            </h2>
            <p className="text-sm text-zinc-500">
              Mascotas perdidas y encontradas en la comunidad, ordenadas por cercanía y fecha.
            </p>
          </div>
          <Link
            href="/mapa"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 dark:text-orange-400 hover:underline"
          >
            Ver todas en el mapa interactivo
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Muro unificado paginado de 6 en 6 con filtros rápidos */}
        <PaginatedPetReportsGrid 
          initialReports={initialReports} 
          type="all" 
          chunkSize={6} 
          emptyMessage="No hay publicaciones activas en este momento." 
          showFilters={true}
          key={region.slug}
        />
      </section>

    </div>
  );
}
