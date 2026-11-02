'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  getAdminStats, 
  deleteAllReportsFromDb,
  getAllReportsForAdmin,
  toggleReportStatusInDb,
  deleteSingleReportFromDb
} from '@/services/reports.service';
import { AdminDashboardStats } from '@/types';
import { formatTimeAgo, formatDate, getSpeciesEmoji, capitalizeWords } from '@/lib/utils';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff,
  LogOut, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  Clock, 
  Sparkles,
  Trash2,
  RefreshCw,
  X,
  Compass,
  ExternalLink,
  Phone,
  Search,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Dog,
  Home,
  Store,
} from 'lucide-react';
import { DEFAULT_REGION } from '@/config/regions';
import { regionForPoint } from '@/config/region-geo';
import { readAdminKey, verifyAdminKey, writeAdminKey } from '@/lib/admin-key-storage';
import { ModerationInbox } from '@/components/admin/ModerationInbox';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminKey, setAdminKey] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'lost' | 'found' | 'sighting'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'REUNITED'>('ALL');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setIsLoadingReports(true);
    try {
      const [statsData, reportsData] = await Promise.all([
        getAdminStats(),
        getAllReportsForAdmin()
      ]);
      setStats(statsData);
      setReportsList(reportsData);
    } catch (e) {
      console.error('Error cargando datos de admin:', e);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Si ya hay una clave guardada en esta pestaña, se vuelve a verificar en el servidor
  useEffect(() => {
    const saved = readAdminKey();
    if (!saved) return;
    let cancelled = false;
    verifyAdminKey(saved).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setAdminKey(saved);
        setIsAuthenticated(true);
        loadData();
      } else {
        writeAdminKey(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoadingLogin(true);
    const key = password.trim();
    const res = await verifyAdminKey(key);
    setIsLoadingLogin(false);
    if (res.ok) {
      writeAdminKey(key);
      setAdminKey(key);
      setIsAuthenticated(true);
      setPassword('');
      loadData();
    } else {
      setLoginError(res.error || 'Clave inválida.');
    }
  };

  const handleLogout = () => {
    writeAdminKey(null);
    setAdminKey('');
    setIsAuthenticated(false);
    setPassword('');
    setDeleteMessage(null);
  };

  const handleToggleStatus = async (
    reportId: string, 
    currentStatus: string, 
    petName: string,
    type: 'lost' | 'found' | 'sighting' = 'lost'
  ) => {
    setTogglingId(reportId);
    setActionFeedback(null);
    try {
      const ok = await toggleReportStatusInDb(reportId, currentStatus, type, adminKey);
      if (ok) {
        const isCurrentlyReunited = currentStatus === 'REUNITED' || currentStatus === 'VERIFIED';
        const nextStatus = isCurrentlyReunited 
          ? (type === 'sighting' ? 'PENDING' : 'ACTIVE') 
          : (type === 'sighting' ? 'VERIFIED' : 'REUNITED');

        setReportsList((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: nextStatus } : r))
        );

        if (stats) {
          if (type === 'lost') {
            setStats({
              ...stats,
              total_reunited_pets: nextStatus === 'REUNITED' ? stats.total_reunited_pets + 1 : Math.max(0, stats.total_reunited_pets - 1),
              active_lost_reports: nextStatus === 'ACTIVE' ? stats.active_lost_reports + 1 : Math.max(0, stats.active_lost_reports - 1),
            });
          } else if (type === 'found') {
            setStats({
              ...stats,
              active_found_reports: nextStatus === 'ACTIVE' ? stats.active_found_reports + 1 : Math.max(0, stats.active_found_reports - 1),
            });
          }
        }

        let feedbackMsg = '';
        if (type === 'sighting') {
          feedbackMsg = nextStatus === 'VERIFIED'
            ? `¡Avistamiento de "${petName}" verificado y resuelto correctamente! ✓`
            : `¡Avistamiento de "${petName}" marcado como pendiente! 🟡`;
        } else if (type === 'found') {
          feedbackMsg = nextStatus === 'REUNITED'
            ? `¡"${petName}" marcada como DEVUELTA A SU FAMILIA! ❤️`
            : `¡"${petName}" reactivada en resguardo/tránsito! 🏠`;
        } else {
          feedbackMsg = nextStatus === 'REUNITED'
            ? `¡"${petName}" fue marcada como ENCONTRADA y reunida con su familia! ❤️`
            : `¡"${petName}" fue reactivada en búsqueda activa! 🔴`;
        }

        setActionFeedback({
          type: 'success',
          text: feedbackMsg
        });
      } else {
        setActionFeedback({ type: 'error', text: 'No se pudo actualizar el estado de la publicación.' });
      }
    } catch (e: any) {
      setActionFeedback({ type: 'error', text: e?.message || 'Error al actualizar.' });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteSingle = async (
    reportId: string, 
    petId?: string, 
    petName: string = 'la mascota',
    type: 'lost' | 'found' | 'sighting' = 'lost'
  ) => {
    if (!confirm(`¿Estás seguro de que deseás eliminar permanentemente la publicación de ${petName}? Esta acción es irreversible.`)) {
      return;
    }
    setDeletingId(reportId);
    try {
      const ok = await deleteSingleReportFromDb(reportId, petId, type, adminKey);
      if (ok) {
        setReportsList((prev) => prev.filter((r) => r.id !== reportId));
        if (stats) {
          if (type === 'lost') {
            setStats({ ...stats, total_lost_reports: Math.max(0, stats.total_lost_reports - 1) });
          } else if (type === 'found') {
            setStats({ ...stats, total_found_reports: Math.max(0, stats.total_found_reports - 1) });
          } else if (type === 'sighting') {
            setStats({ ...stats, total_sightings: Math.max(0, stats.total_sightings - 1) });
          }
        }
        setActionFeedback({ type: 'success', text: `Publicación de "${petName}" eliminada correctamente.` });
      } else {
        setActionFeedback({ type: 'error', text: 'Error al intentar eliminar la publicación.' });
      }
    } catch (e: any) {
      setActionFeedback({ type: 'error', text: e?.message || 'Error al eliminar.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {

    setIsDeleting(true);
    setDeleteMessage(null);
    try {
      const res = await deleteAllReportsFromDb(adminKey);
      if (res.success) {
        setDeleteMessage({ type: 'success', text: res.message });
        const updated = await getAdminStats();
        setStats(updated);
      } else {
        setDeleteMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setDeleteMessage({ type: 'error', text: err?.message || 'Ocurrió un error al eliminar.' });
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  // 1. PANTALLA DE LOGIN (Si NO está autenticado)
  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-full max-w-md space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl">
          
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
              Acceso Super Admin
            </h1>
            <p className="text-xs text-zinc-500">
              Ingresá la clave de administrador (variable ADMIN_API_KEY del servidor). Se verifica en el servidor y se guarda solo en esta pestaña.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Clave de administrador
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="admin-login-btn"
              type="submit"
              disabled={isLoadingLogin}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoadingLogin ? (
                <span>Verificando...</span>
              ) : (
                <>
                  <span>INGRESAR COMO SUPER ADMIN</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <span className="text-[11px] text-zinc-400">
              🔒 Acceso restringido exclusivamente a administradores autorizados.
            </span>
          </div>

        </div>
      </div>
    );
  }

  // 2. PANEL SUPER ADMIN AUTENTICADO
  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center text-zinc-400">
        <ShieldCheck className="w-9 h-9 animate-spin mx-auto text-blue-500 mb-3" />
        <p className="text-sm font-semibold">Cargando métricas de Super Admin...</p>
      </div>
    );
  }

  const reunificationRate = stats.total_lost_reports > 0
    ? Math.round((stats.total_reunited_pets / stats.total_lost_reports) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header con indicador de usuario y botón de Cerrar Sesión */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Super Admin
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
            Panel de Control y Moderación
          </h1>
          <p className="text-sm text-zinc-500">
            Estadísticas en tiempo real de publicaciones, efectividad de reunificación y gestión de reportes de todas las provincias.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <div className="text-[10px] font-semibold">Tasa de Éxito</div>
              <div className="text-sm font-black">{reunificationRate}% reunidas</div>
            </div>
          </div>

          <Link
            href="/admin/comercios"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors"
          >
            <Store className="w-3.5 h-3.5" />
            Comercios Amigos
          </Link>

          <Link
            href="/admin/asociaciones"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
          >
            🏠 Asociaciones de adopción
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Grid de Métricas Principales (4 Tarjetas KPI) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* 1. Mascotas Reunidas ❤️ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between opacity-90">
            <span className="text-xs font-bold uppercase tracking-wider">Reunidas con Familias</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-3xl font-black">{stats.total_reunited_pets}</div>
          <div className="text-[11px] text-emerald-100">Mascotas devueltas a sus hogares</div>
        </div>

        {/* 2. Mascotas Perdidas Totales / Activas */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-bold uppercase tracking-wider">Perdidas Activas</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
          <div className="text-3xl font-black text-rose-600 dark:text-rose-400">
            {stats.active_lost_reports}
          </div>
          <div className="text-[11px] text-zinc-400">De un total de {stats.total_lost_reports} publicaciones</div>
        </div>

        {/* 3. Mascotas Encontradas */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-bold uppercase tracking-wider">Encontradas en Tránsito</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.active_found_reports}
          </div>
          <div className="text-[11px] text-zinc-400">De un total de {stats.total_found_reports} rescatadas</div>
        </div>

        {/* 4. Avistamientos en la Vía Pública */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-bold uppercase tracking-wider">Avistamientos</span>
            <Eye className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-500 dark:text-amber-400">
            {stats.total_sightings}
          </div>
          <div className="text-[11px] text-zinc-400">Reportes de vecinos en la calle</div>
        </div>

      </div>

      {/* Segunda Fila: Desglose por Ciudad, Actividad y Moderación */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Desglose por Ciudad */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-500" />
            Publicaciones por Ciudad
          </h3>

          <div className="space-y-2.5">
            {stats.reports_by_city.filter((c) => c.lost_count > 0).length === 0 && (
              <p className="text-xs text-zinc-400 py-2">Todavía no hay publicaciones con ciudad asignada.</p>
            )}
            {[...stats.reports_by_city]
              .filter((c) => c.lost_count > 0)
              .sort((a, b) => b.lost_count - a.lost_count)
              .slice(0, 15)
              .map((city) => (
              <div key={city.city_name} className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{city.city_name}</span>
                <span className="font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                  {city.lost_count} reportes
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actividad de los últimos 7 días */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Actividad de los Últimos 7 Días
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Mascotas perdidas publicadas</span>
              <span className="font-bold text-rose-600">+{stats.recent_activity_last_7_days.lost_created}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Mascotas encontradas</span>
              <span className="font-bold text-emerald-600">+{stats.recent_activity_last_7_days.found_created}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Avistamientos informados</span>
              <span className="font-bold text-amber-500">+{stats.recent_activity_last_7_days.sightings_created}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Reunificaciones confirmadas</span>
              <span className="font-bold text-emerald-600">+{stats.recent_activity_last_7_days.reunited_count} ❤️</span>
            </div>
          </div>
        </div>

        {/* Bandeja de Moderación y Denuncias (datos reales) */}
        <ModerationInbox adminKey={adminKey} />

      </div>

      {/* Feedback de Acción (Marcar como encontrada, eliminar, etc) */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl text-sm font-semibold flex items-center justify-between border animate-in fade-in duration-200 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800 shadow-sm'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-zinc-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN PRINCIPAL: GESTIÓN DE MASCOTAS PUBLICADAS                        */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-xs font-bold uppercase mb-1">
              <Dog className="w-3.5 h-3.5" />
              Control en Tiempo Real
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
              Mascotas Publicadas
              <span className="text-sm px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                {reportsList.length}
              </span>
            </h2>
            <p className="text-xs text-zinc-500">
              Administrá las publicaciones, marcalas como encontradas cuando regresen con su familia o ubicalas en el mapa.
            </p>
          </div>

          {/* Botón de refresco manual */}
          <button
            onClick={loadData}
            disabled={isLoadingReports}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReports ? 'animate-spin' : ''}`} />
            Actualizar Lista
          </button>
        </div>

        {/* Barra de Filtros por Tipo de Publicación */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              typeFilter === 'ALL'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            Todas las Publicaciones ({reportsList.length})
          </button>
          <button
            onClick={() => setTypeFilter('lost')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'lost'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
            }`}
          >
            <span>🚨</span>
            Mascotas Perdidas ({reportsList.filter((r) => r.publication_type === 'lost').length})
          </button>
          <button
            onClick={() => setTypeFilter('found')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'found'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <span>🏠</span>
            Encontradas en Tránsito ({reportsList.filter((r) => r.publication_type === 'found').length})
          </button>
          <button
            onClick={() => setTypeFilter('sighting')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'sighting'
                ? 'bg-amber-500 text-zinc-950 shadow-sm font-extrabold'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <span>🟡</span>
            Avistamientos en Calle ({reportsList.filter((r) => r.publication_type === 'sighting').length})
          </button>
        </div>

        {/* Barra de Búsqueda y Filtros por Estado */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, calle, contacto o detalle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              Todos los estados
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'ACTIVE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Búsqueda Activa / Pendiente
            </button>
            <button
              onClick={() => setStatusFilter('REUNITED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'REUNITED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <span>❤️</span>
              Encontradas / Reunidas / Verificadas
            </button>
          </div>
        </div>

        {/* Listado de Mascotas */}
        {isLoadingReports ? (
          <div className="p-12 text-center text-zinc-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            <p className="text-xs font-semibold">Cargando publicaciones de mascotas...</p>
          </div>
        ) : (
          (() => {
            const filteredReports = reportsList.filter((item) => {
              // Filtro por tipo
              if (typeFilter !== 'ALL' && item.publication_type !== typeFilter) return false;

              // Filtro por estado
              if (statusFilter === 'ACTIVE' && item.status !== 'ACTIVE' && item.status !== 'PENDING') return false;
              if (statusFilter === 'REUNITED' && item.status !== 'REUNITED' && item.status !== 'VERIFIED') return false;

              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const petName = (item.pet?.name || '').toLowerCase();
                const address = (item.approximate_address || '').toLowerCase();
                const contactName = (item.contact_name || item.profile?.full_name || '').toLowerCase();
                const contactPhone = (item.contact_phone || item.profile?.phone || '').toLowerCase();
                const breed = (item.pet?.breed || '').toLowerCase();
                const desc = (item.description || '').toLowerCase();
                return (
                  petName.includes(q) ||
                  address.includes(q) ||
                  contactName.includes(q) ||
                  contactPhone.includes(q) ||
                  breed.includes(q) ||
                  desc.includes(q)
                );
              }
              return true;
            });

            if (filteredReports.length === 0) {
              return (
                <div className="p-10 text-center rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <span className="text-3xl">🐾</span>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                    No se encontraron publicaciones con ese criterio
                  </h4>
                  <p className="text-xs text-zinc-500">
                    {searchQuery ? 'Probá borrando el filtro de búsqueda.' : 'No hay publicaciones registradas en esta categoría.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReports.map((rep) => {
                  const pubType = rep.publication_type || 'lost';
                  const isLost = pubType === 'lost';
                  const isFound = pubType === 'found';
                  const isSighting = pubType === 'sighting';

                  const pet = rep.pet;
                  const petName = pet?.name || (isLost ? 'Mascota perdida' : isFound ? 'Mascota encontrada' : 'Mascota avistada');
                  const isReunited = rep.status === 'REUNITED' || rep.status === 'VERIFIED';
                  const photo = pet?.photos?.[0] || rep.photo_url || (isLost ? 'https://images.unsplash.com/photo-1543466835-00a7907e9de1' : 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b');
                  
                  // Teléfono para cualquier tipo
                  const phoneRegexMatch = typeof rep.description === 'string'
                    ? rep.description.match(/(?:Contacto \/ WhatsApp:|WhatsApp:|Teléfono:|📞)\s*([0-9+\s\-()]{6,25})/i)
                    : null;
                  const phone = rep.contact_phone || rep.profile?.phone || (phoneRegexMatch ? phoneRegexMatch[1].trim() : '') || '';
                  const cleanPhone = phone.replace(/[^0-9]/g, '');

                  const coords = rep.last_seen_location || rep.found_location || rep.location || { latitude: DEFAULT_REGION.center.lat, longitude: DEFAULT_REGION.center.lng };
                  const lat = coords.latitude || DEFAULT_REGION.center.lat;
                  const lng = coords.longitude || DEFAULT_REGION.center.lng;

                  const publicUrl = isSighting ? `/mascota-avistada/${rep.id}` : `/mascotas-perdidas/${rep.id}`;

                  return (
                    <div
                      key={rep.id}
                      className={`p-5 rounded-3xl border transition-all space-y-4 ${
                        isReunited
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/60 shadow-xs'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm'
                      }`}
                    >
                      <div className="flex gap-4 items-start">
                        {/* Foto */}
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
                          <img src={photo} alt={petName} className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 right-1 text-sm bg-black/50 backdrop-blur-xs rounded-md px-1">
                            {isSighting ? '🟡' : isFound ? '🏠' : getSpeciesEmoji(pet?.species)}
                          </span>
                        </div>

                        {/* Datos Básicos */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Badge de Tipo */}
                            {isLost && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase">
                                🚨 Perdida
                              </span>
                            )}
                            {isFound && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase">
                                🏠 En Tránsito
                              </span>
                            )}
                            {isSighting && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-[10px] font-black uppercase">
                                🟡 Avistamiento
                              </span>
                            )}

                            {/* Badge de Estado */}
                            {isReunited ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {isSighting ? 'Verificado ✓' : 'Encontrada / Reunida ❤️'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                {isSighting ? 'Pendiente' : 'Búsqueda Activa'}
                              </span>
                            )}

                            <span className="text-[10px] text-zinc-400">
                              {formatTimeAgo(rep.created_at)}
                            </span>
                          </div>

                          <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-white truncate">
                            {petName}
                          </h3>

                          <p className="text-xs text-zinc-500 flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <span>{rep.approximate_address || regionForPoint(lat, lng).mainCity}</span>
                          </p>

                          {phone && (
                            <div className="flex items-center gap-2 pt-0.5">
                              <p className="text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-1 font-mono font-bold">
                                <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>{phone}</span>
                              </p>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-extrabold transition-colors cursor-pointer"
                                >
                                  WhatsApp
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botones de Acción para Super Admin */}
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Botón: Marcar como Encontrada / Reunida o Verificado */}
                          {isReunited ? (
                            <div className="inline-flex items-center gap-2">
                              <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shadow-xs select-none">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>{isSighting ? '¡Verificado! ✓' : '¡Mascota Encontrada! ❤️'}</span>
                              </span>
                              <button
                                type="button"
                                disabled={togglingId === rep.id}
                                onClick={() => handleToggleStatus(rep.id, rep.status, petName, pubType)}
                                className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline cursor-pointer"
                              >
                                {isSighting ? 'Desmarcar' : 'Reactivar'}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={togglingId === rep.id}
                              onClick={() => handleToggleStatus(rep.id, rep.status, petName, pubType)}
                              className="px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                            >
                              {togglingId === rep.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>{isSighting ? '✓ Marcar como Verificado' : '¡Marcar como Encontrada! ❤️'}</span>
                            </button>
                          )}

                          {/* Botón: Ubicar en el Mapa */}
                          <Link
                            href={`/mapa?id=${rep.id}&lat=${lat}&lng=${lng}`}
                            target="_blank"
                            className="px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 font-bold text-xs flex items-center gap-1.5 transition-colors border border-orange-200 dark:border-orange-800/60 cursor-pointer"
                          >
                            <Compass className="w-3.5 h-3.5 text-orange-500" />
                            <span>Ver en Mapa</span>
                          </Link>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Ficha pública */}
                          <Link
                            href={publicUrl}
                            target="_blank"
                            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                            title="Ver Ficha Pública"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>

                          {/* Eliminar individual */}
                          <button
                            type="button"
                            disabled={deletingId === rep.id}
                            onClick={() => handleDeleteSingle(rep.id, rep.pet_id, petName, pubType)}
                            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Eliminar publicación"
                          >
                            {deletingId === rep.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>

      {/* Alerta de feedback de acción */}
      {deleteMessage && (
        <div
          className={`p-4 rounded-2xl text-sm font-semibold flex items-center justify-between border animate-in fade-in duration-200 ${
            deleteMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {deleteMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{deleteMessage.text}</span>
          </div>
          <button
            onClick={() => setDeleteMessage(null)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-zinc-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Zona de Mantenimiento y Control Global (Super Admin) */}
      <div className="p-6 rounded-3xl bg-rose-50/70 dark:bg-rose-950/20 border-2 border-dashed border-rose-200 dark:border-rose-900/50 space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-black text-base text-rose-900 dark:text-rose-200 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              Mantenimiento Global: Eliminar Todas las Publicaciones
            </h3>
            <p className="text-xs text-rose-700/80 dark:text-rose-400 max-w-2xl">
              Esta acción vacía por completo la base de datos de mascotas perdidas, encontradas y avistamientos. 
              Útil para limpiar publicaciones de prueba antes del lanzamiento oficial o realizar un reinicio limpio.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            ELIMINAR TODAS LAS PUBLICACIONES
          </button>
        </div>
      </div>

      {/* Modal de Confirmación de Seguridad */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">
                ¿Eliminar todas las publicaciones?
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Estás a punto de borrar <strong>todos los reportes de mascotas perdidas, encontradas y avistamientos</strong> de la base de datos. Esta acción es irreversible.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300">
              ⚠️ Se borrarán {stats.total_lost_reports} reportes de perdidas, {stats.total_found_reports} de encontradas y {stats.total_sightings} avistamientos.
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAll}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-extrabold shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Borrando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Eliminar Todo</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
