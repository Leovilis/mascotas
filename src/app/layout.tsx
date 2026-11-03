import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Footer } from '@/components/layout/Footer';
import { InteractiveTour } from '@/components/layout/InteractiveTour';
import { RegionProvider } from '@/components/region/RegionProvider';
import { getServerRegion } from '@/lib/region/server';

export async function generateMetadata(): Promise<Metadata> {
  const { region } = await getServerRegion();
  const cityList = region.cities.slice(0, 2).map((c) => c.name).join(', ');
  return {
    title: `${region.brandName} — Red Comunitaria de Mascotas Perdidas y Encontradas`,
    description: `Plataforma ciudadana geolocalizada para buscar, reportar avistamientos y reunir mascotas con sus familias en ${cityList} y ${region.provinceName}.`,
    keywords: [...region.seoKeywords, 'reunificación mascotas'],
    openGraph: {
      title: `${region.brandName} — Ayudemos a reunir mascotas con sus familias`,
      description: `Búsqueda comunitaria y geolocalizada de mascotas perdidas y encontradas en ${region.mainCity}.`,
      type: 'website',
      locale: 'es_AR',
      siteName: region.brandName,
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#f97316',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { region, source } = await getServerRegion();
  return (
    <html lang="es" className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased selection:bg-orange-500 selection:text-white"
      >
        <RegionProvider initialSlug={region.slug} initialSource={source}>
          <Navbar />
          <main className="flex-1 w-full pb-20 md:pb-0">{children}</main>
          <Footer />
          <MobileBottomNav />
          <InteractiveTour />
        </RegionProvider>
      </body>
    </html>
  );
}
