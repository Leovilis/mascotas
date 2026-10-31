'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { PlusCircle, Eye, Compass, Sparkles, MapPin, Heart } from 'lucide-react';
import { AdminDashboardStats } from '@/types';
import { useRegion } from '@/components/region/RegionProvider';

interface ParallaxHeroProps {
  stats: AdminDashboardStats;
}

export function ParallaxHero({ stats }: ParallaxHeroProps) {
  const { region } = useRegion();
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax scroll tracking
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 20,
    restDelta: 0.001,
  });

  // Capas de paralaje con diferentes profundidades
  const bgY = useTransform(smoothProgress, [0, 1], ['0%', '40%']);
  const bgScale = useTransform(smoothProgress, [0, 1], [1, 1.15]);
  const floatingOrbsY1 = useTransform(smoothProgress, [0, 1], ['0px', '-90px']);
  const floatingOrbsY2 = useTransform(smoothProgress, [0, 1], ['0px', '-140px']);
  const textY = useTransform(smoothProgress, [0, 1], ['0px', '-35px']);
  const cardsY = useTransform(smoothProgress, [0, 1], ['0px', '-15px']);
  const statsY = useTransform(smoothProgress, [0, 1], ['0px', '25px']);
  const opacity = useTransform(smoothProgress, [0, 0.75], [1, 0.1]);

  return (
    <div
      ref={containerRef}
      className="relative min-h-[85vh] sm:min-h-[80vh] flex flex-col justify-center overflow-hidden border-b border-zinc-200/60 dark:border-zinc-800/60 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 bg-zinc-50/50 dark:bg-zinc-950"
    >
      {/* CAPA 1: Fondos y gradientes ambientales con paralaje */}
      <motion.div
        style={{ y: bgY, scale: bgScale }}
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        {/* Glows superiores */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[350px] sm:w-[650px] h-[350px] sm:h-[450px] bg-gradient-to-tr from-orange-400/25 via-amber-300/20 to-rose-400/15 dark:from-orange-600/15 dark:via-amber-500/10 dark:to-rose-600/10 rounded-full blur-3xl" />
        
        {/* Glow lateral izquierdo */}
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-red-400/15 dark:bg-red-900/10 rounded-full blur-2xl" />

        {/* Glow lateral derecho */}
        <div className="absolute top-1/2 -right-20 w-72 h-72 bg-amber-400/15 dark:bg-amber-900/10 rounded-full blur-2xl" />
      </motion.div>

      {/* CAPA 2: Elementos flotantes temáticos (Huellas animadas continuas y Pines) */}
      <motion.div
        style={{ y: floatingOrbsY1 }}
        className="pointer-events-none absolute inset-0 -z-5 overflow-hidden select-none"
      >
        {/* Huella 1: Flotando con rotación y pulso */}
        <motion.span
          animate={{
            y: [0, -16, 0],
            rotate: [-12, 10, -12],
            scale: [1, 1.18, 1],
            opacity: [0.25, 0.6, 0.25],
          }}
          transition={{
            repeat: Infinity,
            duration: 3.8,
            ease: 'easeInOut',
          }}
          className="absolute top-[12%] left-[8%] sm:left-[14%] text-3xl sm:text-4xl filter drop-shadow-md inline-block"
        >
          🐾
        </motion.span>

        {/* Huella 2: Rastro animado en diagonal derecha */}
        <motion.span
          animate={{
            y: [0, -14, 0],
            rotate: [15, -8, 15],
            scale: [0.95, 1.12, 0.95],
            opacity: [0.2, 0.55, 0.2],
          }}
          transition={{
            repeat: Infinity,
            duration: 4.2,
            delay: 1.2,
            ease: 'easeInOut',
          }}
          className="absolute top-[28%] right-[8%] sm:right-[15%] text-2xl sm:text-3xl filter drop-shadow-sm inline-block"
        >
          🐾
        </motion.span>

        {/* Huella 3: Inferior izquierda con rebote elástico */}
        <motion.span
          animate={{
            y: [0, -12, 0],
            rotate: [-18, 5, -18],
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            repeat: Infinity,
            duration: 3.4,
            delay: 0.6,
            ease: 'easeInOut',
          }}
          className="absolute bottom-[24%] left-[6%] sm:left-[11%] text-2xl sm:text-3xl inline-block"
        >
          🐾
        </motion.span>

        {/* Mascota y Pin */}
        <motion.span
          animate={{ y: [0, -10, 0], rotate: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
          className="absolute top-[18%] right-[12%] sm:right-[22%] text-2xl sm:text-3xl opacity-25 dark:opacity-15 inline-block"
        >
          🐕
        </motion.span>
        
        <motion.span
          animate={{ y: [0, -8, 0], scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 3.6, ease: 'easeInOut' }}
          className="absolute bottom-[30%] right-[7%] sm:right-[13%] text-2xl sm:text-3xl opacity-30 dark:opacity-20 inline-block"
        >
          📍
        </motion.span>
      </motion.div>

      <motion.div
        style={{ y: floatingOrbsY2 }}
        className="pointer-events-none absolute inset-0 -z-5 overflow-hidden select-none"
      >
        {/* Huella 4: Centro izquierda sutil */}
        <motion.span
          animate={{
            y: [0, -15, 0],
            rotate: [20, -10, 20],
            opacity: [0.15, 0.45, 0.15],
          }}
          transition={{
            repeat: Infinity,
            duration: 4.6,
            delay: 1.8,
            ease: 'easeInOut',
          }}
          className="absolute top-[52%] left-[4%] sm:left-[8%] text-2xl inline-block"
        >
          🐾
        </motion.span>

        <span className="absolute top-[40%] right-[4%] sm:right-[8%] text-xl opacity-20 dark:opacity-10">
          ✨
        </span>
      </motion.div>

      {/* CAPA 3: Contenido Principal */}
      <motion.div
        style={{ opacity }}
        className="max-w-4xl mx-auto w-full text-center space-y-5 my-auto"
      >
        
        {/* Badge de Ciudad con Huella Animada */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ y: textY }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/90 dark:bg-orange-950/70 border border-orange-200/80 dark:border-orange-800/60 text-orange-800 dark:text-orange-200 text-xs font-bold uppercase tracking-wider shadow-xs backdrop-blur-xs"
        >
          <motion.span
            animate={{ rotate: [0, 16, -8, 16, 0], scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
            className="inline-block text-sm"
          >
            🐾
          </motion.span>
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
          <span>Red Ciudadana • {region.mainCity}, {region.provinceName}</span>
        </motion.div>

        {/* Título Principal */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          style={{ y: textY }}
          className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-zinc-900 dark:text-white leading-[1.15]"
        >
          Ayudemos a reunir <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-orange-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
            mascotas con sus familias
          </span>
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          style={{ y: textY }}
          className="text-sm sm:text-lg text-zinc-600 dark:text-zinc-300 max-w-2xl mx-auto font-medium leading-relaxed px-2"
        >
          Publicá en 60 segundos, informá un avistamiento geolocalizado o explorá el mapa comunitario en tiempo real.
        </motion.p>

        {/* 3 BOTONES DE ACCIÓN PRINCIPALES (Mobile First con micro-interacciones) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
          style={{ y: cardsY }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 sm:pt-6 max-w-4xl mx-auto"
        >
          {/* 1. PERDÍ UNA MASCOTA */}
          <motion.div
            whileHover={{ scale: 1.03, translateY: -4 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <Link
              id="tour-btn-lost"
              href="/publicar/perdida"
              className="group relative flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-red-500 dark:hover:border-red-500 transition-all text-center h-full"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-rose-600 border border-red-400/40 flex items-center justify-center mb-2 text-white group-hover:scale-110 transition-all shadow-md shadow-red-600/25">
                <PlusCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white stroke-[2.5]" />
              </div>
              <span className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-red-600 transition-colors">
                Perdí mi mascota
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-red-600 dark:text-red-400 mt-0.5">
                🚨 Activar búsqueda
              </span>
            </Link>
          </motion.div>

          {/* 2. VI / ENCONTRÉ UNA MASCOTA */}
          <motion.div
            whileHover={{ scale: 1.03, translateY: -4 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <Link
              id="tour-btn-sighting"
              href="/publicar/avistamiento"
              className="group relative flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-amber-500 dark:hover:border-amber-500 transition-all text-center h-full"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 border border-amber-300/40 flex items-center justify-center mb-2 text-white group-hover:scale-110 transition-all shadow-md shadow-amber-500/25">
                <Eye className="w-7 h-7 sm:w-8 sm:h-8 text-white stroke-[2.5]" />
              </div>
              <span className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 transition-colors">
                Vi / Encontré una mascota
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                🏠 En tránsito o 🟡 en la calle
              </span>
            </Link>
          </motion.div>

          {/* 3. EXPLORAR MAPA */}
          <motion.div
            whileHover={{ scale: 1.03, translateY: -4 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <Link
              id="tour-btn-map"
              href="/mapa"
              className="group relative flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-orange-500/50 dark:hover:border-orange-500/50 transition-all text-center h-full"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200/60 dark:border-orange-900/60 flex items-center justify-center mb-2 text-orange-500 dark:text-orange-400 group-hover:scale-110 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/80 transition-all shadow-xs">
                <Compass className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <span className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-orange-600 transition-colors">
                Explorar Mapa
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                🗺️ En vivo en {region.provinceName}
              </span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Métricas Reales en Vivo con Paralaje y Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: 'easeOut' }}
          style={{ y: statsY }}
          className="grid grid-cols-3 gap-2 sm:gap-4 pt-6 max-w-xl mx-auto border-t border-zinc-200/80 dark:border-zinc-800/80"
        >
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-3 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 shadow-xs">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.total_reunited_pets}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-zinc-600 dark:text-zinc-400">
              Mascotas Reunidas ❤️
            </div>
          </div>
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-3 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 shadow-xs">
            <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
              {stats.active_lost_reports}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-zinc-600 dark:text-zinc-400">
              Búsquedas Activas 🚨
            </div>
          </div>
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-3 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 shadow-xs">
            <div className="text-2xl sm:text-3xl font-black text-amber-500 dark:text-amber-400">
              {stats.total_sightings}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-zinc-600 dark:text-zinc-400">
              Avistadas 🐾
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
