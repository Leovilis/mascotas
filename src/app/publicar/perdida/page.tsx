'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PhotoUploader from '@/components/forms/PhotoUploader';
import LocationPicker from '@/components/map/LocationPicker';
import { lostReportSchema, LostReportInput } from '@/lib/validations/lost-report.schema';
import { PetSpecies, PetSize, PetGender } from '@/types';
import { PlusCircle, ShieldAlert, Sparkles, CheckCircle2, ArrowRight, Clock } from 'lucide-react';
import { createLostReportInDb } from '@/services/reports.service';
import { getLocalDatetimeInputValue, parseLocalInputToIso } from '@/lib/utils';
import { useRegion } from '@/components/region/RegionProvider';
import { NearbyPartners } from '@/components/partners/NearbyPartners';
import { isValidEmail, sanitizePhoneInput } from '@/lib/validations/contact';
import { registerContactEmail } from '@/services/reports.service';
import { TurnstileWidget, TurnstileHandle, TURNSTILE_ENABLED } from '@/components/forms/TurnstileWidget';

const FRIENDLY_LOST_LABELS: Record<string, string> = {
  name: 'Nombre de la mascota',
  contact_email: 'Email',
  species: 'Tipo de animal',
  size: 'Tamaño aproximado',
  primary_color: 'Color principal',
  photos: 'Fotografía de la mascota',
  approximate_address: 'Barrio, plaza o calle',
  last_seen_date: 'Fecha y hora',
  description: 'Descripción de cómo se extravió',
  contact_name: 'Tu nombre',
  contact_phone: 'Teléfono o WhatsApp',
};

export default function PublicarPerdidaPage() {
  const { region } = useRegion();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [managementCode, setManagementCode] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'saved' | 'error'>('idle');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const [formData, setFormData] = useState<Partial<LostReportInput>>({
    species: 'dog',
    gender: 'unknown',
    size: 'medium',
    photos: [],
    latitude: region.center.lat,
    longitude: region.center.lng,
    last_seen_date: getLocalDatetimeInputValue(),
    contact_phone_public: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const payload = {
      ...formData,
      last_seen_date: parseLocalInputToIso(formData.last_seen_date),
    };

    // Validar con Zod
    const validation = lostReportSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        const fieldName = err.path[0]?.toString() || 'campo';
        let msg = err.message;
        if (msg.includes('expected string') || msg.includes('Invalid input')) {
          msg = `Por favor completá el campo: ${FRIENDLY_LOST_LABELS[fieldName] || fieldName}`;
        }
        fieldErrors[fieldName] = msg;
      });
      setFormErrors(fieldErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (TURNSTILE_ENABLED && !turnstileToken) {
      alert('Esperá un segundo a que termine la verificación de seguridad (abajo del formulario) y volvé a tocar el botón.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Se publica a través del servidor (captcha + límite por persona)
      const newId = await createLostReportInDb(validation.data, turnstileToken);
      if (typeof window !== 'undefined') {
        const { saveCreatedReportId, getManagementCode } = await import('@/lib/device-storage');
        saveCreatedReportId('lost', newId);
        setManagementCode(getManagementCode(newId));
      }
      // Email privado: guardarlo y mandar el código de gestión (si lo dejó)
      if (validation.data.contact_email) {
        setEmailStatus('sending');
        registerContactEmail(newId, 'lost', validation.data.contact_email).then((r) =>
          setEmailStatus(r.ok ? (r.sent ? 'sent' : 'saved') : 'error')
        );
      }
      setIsSubmitting(false);
      setSuccessId(newId);
    } catch (err: any) {
      setIsSubmitting(false);
      turnstileRef.current?.reset(); // cada verificación sirve para un solo envío
      alert(`No se pudo publicar: ${err.message || 'Verificá tu conexión'}`);
    }
  };

  const [copiedCode, setCopiedCode] = useState(false);

  if (successId) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white">
            ¡Publicación creada exitosamente! ❤️
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Tu reporte ya está activo en el mapa de {region.provinceName}. Ahora la comunidad puede ayudarte a encontrarla.
          </p>
        </div>

        {/* Tarjeta de Código Único de Gestión */}
        <div className="p-5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-left space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-orange-800 dark:text-orange-300 tracking-wider flex items-center gap-1.5">
              <span>🔑</span> Código Único de Gestión
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(managementCode || successId);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2500);
              }}
              className="px-3 py-1 text-xs font-extrabold rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors cursor-pointer"
            >
              {copiedCode ? '¡Copiado! ✓' : 'Copiar Código'}
            </button>
          </div>
          <div className="font-mono text-xs font-bold bg-white dark:bg-zinc-900 p-3 rounded-xl border border-orange-200 dark:border-orange-900/60 select-all break-all text-orange-950 dark:text-orange-200">
            {managementCode || successId}
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {emailStatus === 'sent' && <strong className="block text-emerald-700 dark:text-emerald-400 mb-1">✓ También te lo enviamos a {formData.contact_email}.</strong>}
            {emailStatus === 'sending' && <span className="block text-zinc-500 mb-1">Enviando el código a tu email…</span>}
            {emailStatus === 'error' && <strong className="block text-rose-600 mb-1">No pudimos registrar tu email: copiá el código ahora.</strong>}
            Guardá este código: es tu llave privada, no lo compartas. Podés ingresarlo en <Link href={`/mis-reportes?code=${encodeURIComponent(managementCode || successId)}`} className="font-bold underline text-orange-600 dark:text-orange-400">Mis Reportes</Link> para administrar tu publicación desde cualquier equipo y marcar a tu mascota como encontrada cuando vuelva a casa.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href={`/mis-reportes?code=${encodeURIComponent(managementCode || successId)}`}
            className="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span>🔑</span> Administrar en Mis Reportes
          </Link>

          <button
            onClick={() => {
              const url = `${window.location.origin}/mascotas-perdidas/${successId}`;
              if (navigator.share) {
                navigator.share({
                  title: `🐾 Mascota perdida en ${region.mainCity}`,
                  text: `Ayudanos a buscar a ${formData.name}. Compartí en grupos de WhatsApp o Facebook:`,
                  url,
                });
              } else {
                navigator.clipboard.writeText(url);
                alert('¡Enlace copiado al portapapeles!');
              }
            }}
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            📢 Compartir WhatsApp
          </button>

          <button
            onClick={() => router.push('/mapa')}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            🗺️ Ver en Mapa
          </button>

          <button
            onClick={() => router.push(`/mascotas-perdidas/${successId}`)}
            className="px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold text-xs transition-all cursor-pointer"
          >
            Ver Ficha
          </button>
        </div>

        {/* Avisar a comercios amigos cercanos (no aparece si no hay ninguno en la zona) */}
        {typeof formData.latitude === 'number' && typeof formData.longitude === 'number' && (
          <div className="text-left">
            <NearbyPartners
              region={region.slug}
              lat={formData.latitude}
              lng={formData.longitude}
              category={null}
              maxKm={10}
              title="Avisá a las veterinarias cercanas"
              subtitle="Muchas mascotas perdidas terminan en una veterinaria o las ve alguien del barrio. Mandales el aviso con un toque."
              whatsappText={`Hola! Se perdió mi mascota ${formData.name || ''} cerca de ${formData.approximate_address || 'su local'}. ¿Me ayudan a difundir? Ficha con fotos: ${typeof window !== 'undefined' ? window.location.origin : ''}/mascotas-perdidas/${successId}`}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Header */}
      <div className="space-y-2 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold uppercase">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          Alerta Inmediata
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
          Perdí a mi mascota
        </h1>
        <p className="text-sm text-zinc-500">
          Completá estos datos básicos para activar la búsqueda en el mapa de {region.provinceName}.
        </p>
      </div>

      {Object.keys(formErrors).length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs space-y-1">
          <p className="font-bold">Por favor completá los siguientes campos requeridos:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {Object.values(formErrors).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. FOTO */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
          <PhotoUploader
            photos={formData.photos || []}
            onChange={(photos) => setFormData({ ...formData, photos })}
            helperText="Subí una foto donde se vea su carita y cuerpo completo."
          />
        </div>

        {/* 2. DATOS DE LA MASCOTA */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
          <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-2">
            1. Datos de la mascota
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Nombre de la mascota <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Toby, Luna, Mishi"
                value={formData.name || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Especie <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.species}
                onChange={(e) => setFormData((prev) => ({ ...prev, species: e.target.value as PetSpecies }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                <option value="dog">Perro 🐕</option>
                <option value="cat">Gato 🐈</option>
                <option value="bird">Ave 🦜</option>
                <option value="rabbit">Conejo 🐇</option>
                <option value="other">Otro animal 🐾</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Raza <span className="text-zinc-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Mestizo, Caniche, Labrador"
                value={formData.breed || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, breed: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Tamaño <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.size}
                onChange={(e) => setFormData((prev) => ({ ...prev, size: e.target.value as PetSize }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none cursor-pointer"
              >
                <option value="small">Chico (-10kg)</option>
                <option value="medium">Mediano (10-25kg)</option>
                <option value="large">Grande (25-40kg)</option>
                <option value="giant">Gigante (+40kg)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Color Principal <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Negro, Marrón, Blanco"
                value={formData.primary_color || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, primary_color: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Sexo
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value as PetGender }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none cursor-pointer"
              >
                <option value="male">Macho</option>
                <option value="female">Hembra</option>
                <option value="unknown">No especificado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Descripción / Rasgos particulares
            </label>
            <textarea
              rows={3}
              placeholder="Ej: Llevaba collar rojo sin chapita, tiene una manchita blanca en el pecho, renguea un poco..."
              value={formData.description || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* 3. UBICACIÓN Y FECHA */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
          <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-2">
            2. ¿Dónde y cuándo la viste por última vez?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Calle o Esquina <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: San Martín o Conesa y Cutillo"
                value={formData.street_name || formData.approximate_address || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    street_name: val,
                    approximate_address: val,
                  }));
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                N° de calle <span className="text-zinc-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ej: 450 o s/n"
                value={formData.street_number || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, street_number: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Barrio <span className="text-zinc-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Padre Juan, Centro..."
                value={formData.neighborhood || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, neighborhood: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Fecha y hora aproximada <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const pad = (n: number) => n.toString().padStart(2, '0');
                  const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                  setFormData((prev) => ({ ...prev, last_seen_date: localIso }));
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800/60 transition-colors cursor-pointer"
              >
                <Clock className="w-3 h-3" />
                Poner actual
              </button>
            </div>
            <input
              type="datetime-local"
              value={formData.last_seen_date || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, last_seen_date: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <LocationPicker
            initialLat={formData.latitude}
            initialLng={formData.longitude}
            onLocationChange={(lat, lng, street, houseNumber) => {
              setFormData((prev) => ({
                ...prev,
                latitude: lat,
                longitude: lng,
                ...(street ? { street_name: street, approximate_address: street } : {}),
                ...(houseNumber ? { street_number: houseNumber } : {}),
              }));
            }}
            label={`Marcar punto en el mapa de ${region.provinceName}`}
          />
        </div>

        {/* 4. CONTACTO */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
          <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-2">
            3. Medio de Contacto
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Tu Nombre o Apodo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Laura"
                value={formData.contact_name || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, contact_name: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Teléfono / WhatsApp <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                placeholder={`Ej: ${region.phoneExample}`}
                value={formData.contact_phone || ''}
                inputMode="tel"
                onChange={(e) => setFormData((prev) => ({ ...prev, contact_phone: sanitizePhoneInput(e.target.value) }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {formErrors.contact_phone && <p className="text-xs text-rose-600 mt-1">{formErrors.contact_phone}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Email <span className="font-normal text-zinc-500">(opcional, no se publica)</span>
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Ej: nombre@gmail.com"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, contact_email: e.target.value.replace(/\s/g, '') }))}
                onBlur={() => {
                  const v = (formData.contact_email || '').trim();
                  setFormErrors((prev) => {
                    const next = { ...prev };
                    if (v && !isValidEmail(v)) next.contact_email = 'El email no tiene un formato válido (ej: nombre@gmail.com)';
                    else delete next.contact_email;
                    return next;
                  });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {formErrors.contact_email ? (
                <p className="text-xs text-rose-600 mt-1">{formErrors.contact_email}</p>
              ) : (
                <p className="text-[11px] text-zinc-500 mt-1">
                  Te mandamos tu código de gestión y te avisamos si alguien ve a tu mascota. Si perdés el código, lo recuperás con este mail.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Verificación anti-spam (Cloudflare Turnstile) */}
        <TurnstileWidget ref={turnstileRef} onToken={setTurnstileToken} className="flex justify-center" />

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-base shadow-lg shadow-rose-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span>Publicando en el mapa...</span>
          ) : (
            <>
              <span>ACTIVAR BÚSQUEDA AHORA</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

      </form>

    </div>
  );
}
