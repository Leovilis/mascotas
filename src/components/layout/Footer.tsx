import React from 'react';
import Link from 'next/link';
import { Heart, ShieldCheck, QrCode, Store } from 'lucide-react';
import { getServerRegion } from '@/lib/region/server';

export async function Footer() {
  const { region } = await getServerRegion();
  return (
    <footer className="bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 py-10 px-4 sm:px-6 lg:px-8 pb-24 md:pb-10 transition-colors">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Brand & Purpose */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <span className="font-extrabold text-lg text-zinc-900 dark:text-white">
              Mascotas<span className="text-orange-600">{region.brandSuffix}</span>
            </span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md leading-relaxed">
            Una red ciudadana geolocalizada enfocada exclusivamente en <strong>reunir mascotas perdidas con sus familias</strong> en {region.coverageText}.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            ⚠️ No es una red social de entretenimiento. Prohibida la compra/venta y solicitud de recompensas fraudulentas.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200 mb-3">
            Acciones Rápidas
          </h4>
          <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              <Link href="/publicar/perdida" className="hover:text-rose-600 transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Publicar Mascota Perdida
              </Link>
            </li>
            <li>
              <Link href="/publicar/encontrada" className="hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Publicar Mascota Encontrada
              </Link>
            </li>
            <li>
              <Link href="/publicar/avistamiento" className="hover:text-amber-600 transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Reportar Avistamiento Rápido
              </Link>
            </li>
            <li>
              <Link href="/mapa" className="hover:text-orange-600 transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                Explorar Mapa en Vivo
              </Link>
            </li>
          </ul>
        </div>

        {/* Community & QR */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200 mb-3">
            Comunidad y QRs
          </h4>
          <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              <Link href="/carteles-qr" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-blue-500" />
                Carteles QR para Veterinarias
              </Link>
            </li>
            <li>
              <Link href="/comercios" className="hover:text-orange-600 transition-colors flex items-center gap-1.5">
                <Store className="w-4 h-4 text-orange-500" />
                Comercios Amigos
              </Link>
            </li>
            <li>
              <Link href="/mis-reportes" className="hover:text-orange-600 transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                Panel de Mis Publicaciones
              </Link>
            </li>
          </ul>
          <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400">
            {region.cities.map((c) => c.name).join(' • ')}
          </div>
        </div>

      </div>
    </footer>
  );
}
