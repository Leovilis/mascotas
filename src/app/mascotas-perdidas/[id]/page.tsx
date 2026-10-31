import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getUnifiedReportById, getSightingsForReport } from '@/services/reports.service';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { 
  formatDistance, 
  formatTimeAgo, 
  formatDate, 
  getSpeciesEmoji, 
  getSpeciesLabel, 
  getSizeLabel, 
  getGenderLabel,
  parseGeoLocation
} from '@/lib/utils';
import { 
  MapPin, 
  Clock, 
  Phone, 
  MessageCircle, 
  Share2, 
  Eye, 
  AlertTriangle, 
  Heart,
  ChevronLeft,
  CheckCircle2,
  ShieldAlert,
  Home
} from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export const revalidate = 60;

// Generación de Metadatos Dinámicos Open Graph para WhatsApp y Facebook
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const report = await getUnifiedReportById(id);

  if (!report) {
    return { title: `Mascota no encontrada — ${PLATFORM_NAME}` };
  }

  const isLost = report.report_type === 'lost';
  const coords = parseGeoLocation(isLost ? report.last_seen_location : report.found_location);
  const region = regionForPoint(coords?.latitude, coords?.longitude);
  const name = report.pet?.name || (isLost ? 'Mascota perdida' : 'Mascota encontrada');
  const species = report.pet ? getSpeciesLabel(report.pet.species) : 'Mascota';
  
  const title = isLost 
    ? `🚨 BUSCAMOS A ${name.toUpperCase()} (${species}) en ${report.approximate_address}`
    : `🟢 MASCOTA ENCONTRADA (${species}) en ${report.approximate_address}`;

  const description = report.description || `Ayudanos a reunirla con su familia en ${region.mainCity}.`;
  const image = report.pet?.photos?.[0] || 'https://images.unsplash.com/photo-1552053831-71594a27632d';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 800, height: 600, alt: name }],
      type: 'article',
    },
  };
}

import PetDetailInteractive from '@/components/ui/PetDetailInteractive';
import { PLATFORM_NAME } from '@/config/regions';
import { regionForPoint } from '@/config/region-geo';

export default async function DetalleMascotaPage({ params }: Props) {
  const { id } = await params;
  const report = await getUnifiedReportById(id);

  if (!report) {
    notFound();
  }

  const isLost = report.report_type === 'lost';
  const sightings = isLost ? await getSightingsForReport(id) : [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PetDetailInteractive report={report} sightings={sightings} />
    </div>
  );
}
