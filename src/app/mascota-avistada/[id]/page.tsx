import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSightingById } from '@/services/reports.service';
import SightingDetailInteractive from '@/components/ui/SightingDetailInteractive';
import { parseGeoLocation } from '@/lib/utils';
import { PLATFORM_NAME } from '@/config/regions';
import { regionForPoint } from '@/config/region-geo';

interface Props {
  params: Promise<{ id: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sighting = await getSightingById(id);

  if (!sighting) {
    return { title: `Avistamiento no encontrado — ${PLATFORM_NAME}` };
  }

  const coords = parseGeoLocation(sighting.location);
  const region = regionForPoint(coords?.latitude, coords?.longitude);
  const petName = sighting.lost_report?.pet?.name;
  const title = petName 
    ? `🟡 VIERON A ${petName.toUpperCase()} en ${sighting.approximate_address} — ${region.brandName}`
    : `🟡 AVISTAMIENTO EN ${sighting.approximate_address} — ${region.brandName}`;

  const description = sighting.description || `Se reportó un avistamiento de mascota en ${sighting.approximate_address}.`;
  const image = sighting.photo_url || sighting.lost_report?.pet?.photos?.[0] || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 800, height: 600, alt: title }],
      type: 'article',
    },
  };
}

export default async function MascotaAvistadaDetailPage({ params }: Props) {
  const { id } = await params;
  const sighting = await getSightingById(id);

  if (!sighting) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SightingDetailInteractive sighting={sighting} />
    </div>
  );
}
