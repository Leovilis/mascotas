'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Compass, PlusCircle, Eye, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const pathname = usePathname();

  const items = [
    { href: '/', label: 'Inicio', icon: Home },
    { href: '/publicar/perdida', label: 'Perdí', icon: PlusCircle },
    { href: '/mapa', label: 'Mapa', icon: Compass, isMain: true },
    { href: '/publicar/avistamiento', label: 'Avisté', icon: Eye },
    { href: '/mis-reportes', label: 'Mis Avisos', icon: FileText },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800/80 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto relative items-center px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          if (item.isMain) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-center -mt-5 group"
              >
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className={cn(
                    'w-13 h-13 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-zinc-950 transition-all duration-300',
                    isActive
                      ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white shadow-orange-500/40 scale-105'
                      : 'bg-zinc-900 text-white dark:bg-zinc-800 shadow-zinc-900/30'
                  )}
                >
                  <motion.div
                    animate={isActive ? { rotate: [0, -15, 15, -8, 0] } : { rotate: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  >
                    <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                  </motion.div>
                </motion.div>
                <span
                  className={cn(
                    'text-[10px] font-black mt-1 transition-colors',
                    isActive
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-zinc-600 dark:text-zinc-400'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center h-full group py-1"
            >
              {/* Indicador de píldora activa flotante */}
              {isActive && (
                <motion.div
                  layoutId="activeBottomNavPill"
                  className="absolute inset-x-2 inset-y-1.5 bg-orange-100/80 dark:bg-orange-950/50 rounded-2xl -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              {/* Icono con animación de rebote y relleno/vacío */}
              <motion.div
                animate={
                  isActive
                    ? { scale: [0.85, 1.15, 1], y: -2 }
                    : { scale: 1, y: 0 }
                }
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className={cn(
                  'relative transition-colors duration-200',
                  isActive
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'
                )}
              >
                <Icon
                  className="w-5 h-5"
                  strokeWidth={isActive ? 2.6 : 1.8}
                  fill={isActive ? 'currentColor' : 'none'}
                />

                {/* Punto indicador superior */}
                {isActive && (
                  <motion.span
                    layoutId="activeBottomNavDot"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600 dark:bg-orange-400"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.div>

              <span
                className={cn(
                  'text-[10px] tracking-tight transition-all duration-200 mt-0.5',
                  isActive
                    ? 'font-black text-orange-600 dark:text-orange-400 scale-105'
                    : 'font-semibold text-zinc-500 dark:text-zinc-400'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

