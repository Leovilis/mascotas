'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Menu, 
  X,
  Compass,
  FileText,
  Eye,
  PlusCircle,
  QrCode,
  Sparkles,
  ArrowRight,
  Layers,
  Search,
  Store
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useRegion } from '@/components/region/RegionProvider';
import { RegionSelector } from '@/components/region/RegionSelector';

export function Navbar() {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const { region } = useRegion();

  // Close modal on escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close modal when route changes
  useEffect(() => {
    setModalOpen(false);
  }, [pathname]);

  const quickActions = [
    {
      href: '/publicar/perdida',
      title: 'Perdí mi mascota',
      desc: 'Crear alerta urgente con foto y zona de extravío',
      icon: PlusCircle,
      badge: 'Urgente',
      color: 'from-red-500 via-red-600 to-rose-600',
      textColor: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-50/90 dark:bg-red-950/50 border-red-300 dark:border-red-800/60',
    },
    {
      href: '/publicar/avistamiento',
      title: 'Vi / Encontré una mascota',
      desc: 'Publicar avistamiento para ayudar al dueño a encontrarlo',
      icon: Eye,
      badge: 'Comunidad',
      color: 'from-amber-400 via-amber-500 to-orange-500',
      textColor: 'text-orange-700 dark:text-orange-300',
      bgColor: 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800/60',
    },
  ];

  const exploreLinks = [
    {
      href: '/mapa',
      title: 'Mapa Interactivo',
      desc: 'Explorar reportes geolocalizados en tiempo real',
      icon: Compass,
      highlight: true,
    },
    {
      href: '/carteles-qr',
      title: 'Carteles QR de Búsqueda',
      desc: 'Generar pósteres con QR listos para imprimir',
      icon: QrCode,
    },
    {
      href: '/comercios',
      title: 'Comercios Amigos',
      desc: 'Veterinarias, pet shops y refugios de tu provincia',
      icon: Store,
    },
    {
      href: '/mis-reportes',
      title: 'Mis Reportes',
      desc: 'Gestionar y actualizar el estado de tus publicaciones',
      icon: FileText,
    },
    {
      href: '/admin',
      title: 'Panel de Moderación',
      desc: 'Herramientas de administración y control',
      icon: ShieldCheck,
      adminOnly: true,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo & City Selector */}
            <div className="flex items-center gap-3">
              <Link id="tour-brand" href="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                  <span className="text-xl">🐾</span>
                </div>
                <div>
                  <span className="font-extrabold text-lg tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5">
                    Mascotas<span className="text-orange-600 dark:text-orange-500">{region.brandSuffix}</span>
                  </span>
                  <span className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Red Comunitaria
                  </span>
                </div>
              </Link>

              {/* Selector de Provincia (con detección por GPS) */}
              <RegionSelector variant="pill" className="hidden sm:flex" />
            </div>

            {/* Desktop Navigation Links & Modal Trigger */}
            <div className="flex items-center gap-2">
              <nav className="hidden md:flex items-center gap-1 lg:gap-2">
                <Link
                  href="/mapa"
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors',
                    pathname === '/mapa'
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-orange-600 dark:text-orange-400 font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  )}
                >
                  <Compass className="w-4 h-4 text-orange-500" />
                  Mapa
                </Link>

                <Link
                  href="/carteles-qr"
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors',
                    pathname === '/carteles-qr'
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-orange-600 dark:text-orange-400 font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  )}
                >
                  <QrCode className="w-4 h-4 text-zinc-500" />
                  Carteles QR
                </Link>
              </nav>

              {/* Botón de Menú con Ícono Hamburguesa (Abre el modal central) */}
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center justify-center p-2 sm:px-3.5 sm:py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-bold text-xs transition-all active:scale-95 cursor-pointer border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs"
                aria-label="Abrir menú de navegación"
              >
                <Menu className="w-5 h-5 text-zinc-900 dark:text-zinc-100" strokeWidth={2.2} />
                <span className="hidden sm:inline-block ml-1.5">Menú</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Centered Navigation Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop con desenfoque */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden z-10 my-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-900 dark:text-white leading-tight">
                      Centro de Navegación
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Acceso rápido a todas las herramientas de la red
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                
                {/* 1. Publicar / Reportes de Emergencia */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Publicaciones y Alertas
                    </span>
                    <span className="text-[11px] font-medium text-orange-600 dark:text-orange-400">
                      Acción Inmediata
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <Link
                          key={action.href}
                          href={action.href}
                          onClick={() => setModalOpen(false)}
                          className={cn(
                            'group p-4 rounded-2xl border transition-all duration-200 hover:shadow-md hover:scale-101 flex flex-col justify-between relative overflow-hidden',
                            action.bgColor
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-tr text-white shadow-sm', action.color)}>
                              <Icon className="w-5 h-5 text-white stroke-[2.5]" />
                            </div>
                            <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white dark:bg-zinc-900 shadow-xs', action.textColor)}>
                              {action.badge}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors flex items-center gap-1.5">
                              {action.title}
                              <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-orange-500" />
                            </h4>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                              {action.desc}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Exploración y Servicios */}
                <div>
                  <div className="mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Explorar y Comunidad
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {exploreLinks.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setModalOpen(false)}
                          className={cn(
                            'flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all duration-150 group',
                            isActive
                              ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'
                              : 'bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300'
                          )}
                        >
                          <div className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                            isActive
                              ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                              : item.adminOnly 
                                ? 'bg-zinc-900 text-white dark:bg-zinc-700' 
                                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                          )}>
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                'text-sm font-bold truncate',
                                isActive ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-900 dark:text-white'
                              )}>
                                {item.title}
                              </span>
                              {item.adminOnly && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                              {item.desc}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Provincia y Cobertura */}
                <RegionSelector variant="panel" />

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  Presiona <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 shadow-2xs">ESC</kbd> para cerrar
                </span>
                <span className="font-bold text-orange-600 dark:text-orange-400">
                  {region.brandName}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

