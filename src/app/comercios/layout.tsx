import type { Metadata } from 'next';
import { getServerRegion } from '@/lib/region/server';

export async function generateMetadata(): Promise<Metadata> {
  const { region } = await getServerRegion();
  return {
    title: `Comercios Amigos en ${region.provinceName} — ${region.brandName}`,
    description: `Veterinarias, pet shops, guarderías y refugios de ${region.provinceName} que colaboran con la red de mascotas perdidas.`,
  };
}

export default function ComerciosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
