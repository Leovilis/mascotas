import type { MetadataRoute } from 'next';

/** Para "Agregar a la pantalla de inicio" en Android/Chrome */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mascotas Argentinas — Red comunitaria',
    short_name: 'Mascotas',
    description: 'Mascotas perdidas, encontradas y en adopción en toda la Argentina.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f97316',
    lang: 'es-AR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
