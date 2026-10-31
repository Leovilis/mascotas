'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LostReport, FoundReport } from '@/types';
import { 
  FileText, 
  Heart, 
  Eye, 
  CheckCircle2, 
  Sparkles, 
  Share2, 
  PlusCircle,
  Clock,
  MapPin,
  Printer,
  Smartphone,
  AlertCircle,
  KeyRound,
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getMyReportIds, parseManagementCode, saveCreatedReportId, saveEditToken } from '@/lib/device-storage';
import { getReportsByIdsList, markReportAsReunitedInDb } from '@/services/reports.service';
import { formatTimeAgo, formatDate, getSpeciesEmoji } from '@/lib/utils';
import { useRegion } from '@/components/region/RegionProvider';
import { RecoverCodeForm } from '@/components/forms/RecoverCodeForm';

function MisReportesInner() {
  const { region } = useRegion();
  const searchParams = useSearchParams();
  const urlCode = searchParams.get('code');

  const [selectedTab, setSelectedTab] = useState<'lost' | 'found' | 'sightings'>('lost');
  const [isLoading, setIsLoading] = useState(true);

  const [myLostList, setMyLostList] = useState<any[]>([]);
  const [myFoundList, setMyFoundList] = useState<any[]>([]);
  const [mySightingsList, setMySightingsList] = useState<any[]>([]);

  const [linkInputId, setLinkInputId] = useState('');
  const [linkMessage, setLinkMessage] = useState<string | null>(null);

  // Cargar reportes vinculados a este dispositivo
  const loadReports = async () => {
    setIsLoading(true);
    try {
      const lostIds = getMyReportIds('lost');
      const foundIds = getMyReportIds('found');
      const sightingIds = getMyReportIds('sighting');

      const [lostData, foundData, sightingData] = await Promise.all([
        getReportsByIdsList('lost', lostIds),
        getReportsByIdsList('found', foundIds),
        getReportsByIdsList('sighting', sightingIds),
      ]);

      setMyLostList(lostData);
      setMyFoundList(foundData);
      setMySightingsList(sightingData);
    } catch (e) {
      console.error('Error cargando reportes del dispositivo:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (urlCode) {
      handleLinkManualId(undefined, urlCode);
    } else {
      loadReports();
    }
  }, [urlCode]);

  const handleMarkReunited = async (id: string, name: string) => {
    if (confirm(`¿Confirmás que ${name} ya fue reunida con su familia? ❤️`)) {
      const result = await markReportAsReunitedInDb(id, 'lost');
      if (result.ok) {
        setMyLostList((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'REUNITED' } : r))
        );
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        alert(result.error || 'Hubo un inconveniente al actualizar el estado. Por favor reintentá.');
      }
    }
  };

  const handleLinkManualId = (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const input = (customCode || linkInputId).trim();
    if (!input) return;

    // Acepta el código de gestión ("id.token"), un ID suelto o una URL de la publicación
    const { id: raw, token } = parseManagementCode(input);
    if (!raw) return;

    saveCreatedReportId('lost', raw);
    saveCreatedReportId('found', raw);
    if (token) saveEditToken(raw, token);
    setLinkMessage(
      token
        ? '¡Publicación vinculada con éxito! Ya podés gestionarla aquí abajo.'
        : 'Publicación vinculada solo para ver. Para marcarla como reunida necesitás el código de gestión completo (el que se mostró al publicar).'
    );
    setLinkInputId('');
    loadReports();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-xs font-bold uppercase mb-1">
            <Smartphone className="w-3.5 h-3.5" />
            Panel de Gestión de Publicaciones
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-orange-500" />
            Mis Reportes
          </h1>
          <p className="text-sm text-zinc-500">
            Gestioná tus alertas creadas, confirmá cuando tu mascota regresó a casa e imprimí sus carteles.
          </p>
        </div>

        <Link
          href="/publicar/perdida"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Nueva Publicación
        </Link>
      </div>

      {/* Input de Código Único de Gestión */}
      <div className="p-6 rounded-3xl bg-linear-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-zinc-900 border border-orange-200 dark:border-orange-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white">
              ¿Tenés el código único de tu publicación?
            </h3>
            <p className="text-xs text-zinc-500">
              Ingresalo acá para acceder a la administración de tu mascota y marcarla como encontrada.
            </p>
          </div>
        </div>

        <form onSubmit={handleLinkManualId} className="flex flex-col sm:flex-row gap-2 pt-1">
          <input
            type="text"
            placeholder="Pegá el código único o ID (ej: d9b7c...)..."
            value={linkInputId}
            onChange={(e) => setLinkInputId(e.target.value)}
            className="flex-1 px-4 py-3 rounded-2xl border border-orange-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Gestionar Publicación</span>
          </button>
        </form>

        <RecoverCodeForm />

        {linkMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{linkMessage}</span>
          </div>
        )}
      </div>


      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setSelectedTab('lost')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
            selectedTab === 'lost'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          Mascotas Perdidas ({myLostList.length})
        </button>
        <button
          onClick={() => setSelectedTab('found')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
            selectedTab === 'found'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          Mascotas Encontradas ({myFoundList.length})
        </button>
        <button
          onClick={() => setSelectedTab('sightings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
            selectedTab === 'sightings'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          Avistamientos Aportados ({mySightingsList.length})
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-zinc-500 space-y-2">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold">Cargando tus publicaciones...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: PERDIDAS */}
          {selectedTab === 'lost' && (
            myLostList.length === 0 ? (
              <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto text-2xl">
                  🐕
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  No tenés publicaciones de mascotas perdidas creadas en este celular
                </h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                  Cuando crees una publicación desde este equipo, aparecerá acá automáticamente para que puedas gestionarla.
                </p>
                <div className="pt-2">
                  <Link
                    href="/publicar/perdida"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Publicar Mascota Perdida
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {myLostList.map((rep) => {
                  const isReunited = rep.status === 'REUNITED';
                  const pet = rep.pet;
                  const petName = pet?.name || 'Mascota perdida';
                  const photo = pet?.photos?.[0] || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1';

                  return (
                    <div
                      key={rep.id}
                      className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
                            <img
                              src={photo}
                              alt={petName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={rep.status} />
                              <span className="text-xs text-zinc-500">
                                Extraviado {formatTimeAgo(rep.last_seen_date)} • Pub. {formatTimeAgo(rep.created_at)}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                              {petName}
                            </h3>
                            <p className="text-xs text-zinc-500 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-orange-500" />
                              {rep.approximate_address}
                            </p>
                          </div>
                        </div>

                        {/* Acciones del Dueño */}
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                          {!isReunited ? (
                            <button
                              onClick={() => handleMarkReunited(rep.id, petName)}
                              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              ¡YA LA ENCONTRÉ! REUNIDA ❤️
                            </button>
                          ) : (
                            <span className="px-4 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                              ❤️ Caso Exitoso Cerrado
                            </span>
                          )}

                          <Link
                            href={`/mascotas-perdidas/${rep.id}`}
                            className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-colors"
                          >
                            Ver Publicación
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 2: ENCONTRADAS */}
          {selectedTab === 'found' && (
            myFoundList.length === 0 ? (
              <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mx-auto text-2xl">
                  💚
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  No tenés reportes de animales encontrados en este equipo
                </h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                  Si tenés un animal en tránsito en tu casa, podés publicarlo para que su familia lo ubique.
                </p>
                <div className="pt-2">
                  <Link
                    href="/publicar/encontrada"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Publicar Animal Encontrado
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {myFoundList.map((rep) => {
                  const photo = rep.pet?.photos?.[0] || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1';
                  return (
                    <div
                      key={rep.id}
                      className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-100">
                          <img src={photo} alt="Encontrado" className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                            🟢 Encontrado
                          </span>
                          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                            {rep.approximate_address}
                          </h3>
                          <p className="text-xs text-zinc-500">
                            {rep.is_holding ? '🏠 En resguardo en tu casa' : '📍 Visto en la vía pública'} • {formatTimeAgo(rep.found_date)}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/mascotas-perdidas/${rep.id}`}
                        className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs"
                      >
                        Ver Publicación
                      </Link>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 3: AVISTAMIENTOS */}
          {selectedTab === 'sightings' && (
            mySightingsList.length === 0 ? (
              <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto text-2xl">
                  🟡
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  No registraste avistamientos aún
                </h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                  Si viste a un perro o gato deambulando en una esquina de {region.mainCity}, podés aportar el dato en 30 segundos.
                </p>
                <div className="pt-2">
                  <Link
                    href="/publicar/avistamiento"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-zinc-950 font-black text-xs shadow-md border-2 border-amber-500"
                  >
                    <Eye className="w-4 h-4" />
                    Reportar Avistamiento
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {mySightingsList.map((s) => (
                  <div
                    key={s.id}
                    className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                  >
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                        🟡 Avistamiento
                      </span>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                        {s.approximate_address}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {s.description}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Registrado {formatTimeAgo(s.sighting_date)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/mascota-avistada/${s.id}`}
                        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs whitespace-nowrap shadow-sm transition-all"
                      >
                        Ver Ficha
                      </Link>
                      <Link
                        href="/mapa"
                        className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs whitespace-nowrap"
                      >
                        En Mapa
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Vincular publicación manual por código/ID si se publicó desde otro equipo */}
      <div className="p-5 rounded-3xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-3">
        <h4 className="text-xs font-black uppercase text-zinc-600 dark:text-zinc-400 tracking-wider">
          ¿Publicaste desde otra computadora o celular?
        </h4>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Podés pegar el ID o enlace de tu publicación para sincronizarla y administrarla también desde este dispositivo.
        </p>

        <form onSubmit={handleLinkManualId} className="flex flex-col sm:flex-row gap-2 max-w-lg">
          <input
            type="text"
            placeholder="Pegá el ID o enlace de la publicación..."
            value={linkInputId}
            onChange={(e) => setLinkInputId(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-xs shrink-0 cursor-pointer"
          >
            Vincular
          </button>
        </form>

        {linkMessage && (
          <p className="text-xs text-emerald-600 font-bold">{linkMessage}</p>
        )}
      </div>

    </div>
  );
}

export default function MisReportesPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-16 text-center text-zinc-500 space-y-2">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold">Cargando panel de mis reportes...</p>
        </div>
      }
    >
      <MisReportesInner />
    </Suspense>
  );
}
