'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PhotoUploader from '@/components/forms/PhotoUploader';
import LocationPicker from '@/components/map/LocationPicker';
import { sightingSchema, SightingInput } from '@/lib/validations/sighting.schema';
import { Eye, CheckCircle2, ArrowRight, Clock, MessageCircle, MapPin, AlertCircle, ChevronDown, BellRing } from 'lucide-react';
import { createSightingInDb, getActiveLostPetsList } from '@/services/reports.service';
import { saveCreatedReportId } from '@/lib/device-storage';
import { 
  formatWhatsAppPhone, 
  capitalizeWords, 
  capitalizeFirst,
  getLocalDatetimeInputValue,
  parseLocalInputToIso
} from '@/lib/utils';
import { useRegion } from '@/components/region/RegionProvider';
import { SITE_URL } from '@/config/regions';

function SightingForm() {
  const { region } = useRegion();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialReportId = searchParams.get('reportId') || '';
  const initialPetName = searchParams.get('petName') || '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdSightingId, setCreatedSightingId] = useState<string>('');
  const [registeredPet, setRegisteredPet] = useState<{ name: string; phone?: string; address?: string; desc?: string; waUrl?: string } | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [activeLostPets, setActiveLostPets] = useState<{ id: string; name: string; photo_url: string | null; address: string; phone?: string; owner_name?: string }[]>([]);

  const [formData, setFormData] = useState<Partial<SightingInput> & { photos?: string[] }>({
    lost_report_id: initialReportId || null,
    is_holding: false,
    contact_phone: '',
    latitude: region.center.lat,
    longitude: region.center.lng,
    sighting_date: getLocalDatetimeInputValue(),
    approximate_address: region.sampleAddress,
    photos: [],
  });

  // Cargar lista de mascotas perdidas activas
  useEffect(() => {
    async function loadPets() {
      const list = await getActiveLostPetsList(region.slug);
      setActiveLostPets(list);
    }
    loadPets();
  }, [region.slug]);

  const selectedPet = activeLostPets.find((p) => p.id === formData.lost_report_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const formattedAddress = formData.neighborhood?.trim()
      ? `${formData.approximate_address?.trim() || ''}, B° ${formData.neighborhood.trim().replace(/^b[°ºa-z.]*\s*/i, '')}`
      : (formData.approximate_address || '');

    const isoSightingDate = parseLocalInputToIso(formData.sighting_date);

    const payload: SightingInput = {
      lost_report_id: formData.lost_report_id && formData.lost_report_id.trim() ? formData.lost_report_id : null,
      is_holding: formData.is_holding,
      contact_phone: formData.contact_phone || null,
      latitude: formData.latitude || region.center.lat,
      longitude: formData.longitude || region.center.lng,
      approximate_address: formattedAddress,
      sighting_date: isoSightingDate,
      photo_url: formData.photos?.[0] || null,
      description: formData.description || '',
      reporter_name: formData.reporter_name || 'Vecino solidario',
    };


    const validation = sightingSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setFormErrors(fieldErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newSightingId = await createSightingInDb(validation.data);
      // Guardar ID en almacenamiento local para "Mis Reportes"
      saveCreatedReportId('sighting', newSightingId);
      setCreatedSightingId(newSightingId);

      const targetPetName = capitalizeWords(selectedPet?.name || initialPetName || 'tu mascota');
      const targetPhone = selectedPet?.phone || '';
      const cleanPhone = formatWhatsAppPhone(targetPhone);
      
      let waUrl = '';
      if (cleanPhone) {
        const sightingUrl = typeof window !== 'undefined' ? `${window.location.origin}/mascota-avistada/${newSightingId}` : `${SITE_URL}/mascota-avistada/${newSightingId}`;
        const whatsappText = `¡Hola! 🐾 Acaban de reportar un *AVISTAMIENTO* de tu mascota *${targetPetName}* en ${region.mainCity}.\n\n📍 *Lugar:* ${capitalizeWords(formattedAddress)}\n📝 *Detalles:* ${capitalizeFirst(formData.description || 'Visto en la vía pública')}\n\n👉 *Mirá la ficha del avistamiento y fotos aquí:*\n${sightingUrl}`;
        waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`;
        
        // Disparar automáticamente la notificación por WhatsApp
        try {
          window.open(waUrl, '_blank');
        } catch (errOpen) {
          console.warn('Popup bloqueado:', errOpen);
        }
      }

      setRegisteredPet({
        name: targetPetName,
        phone: cleanPhone,
        address: formattedAddress,
        desc: formData.description,
        waUrl,
      });

      setIsSubmitting(false);
      setSuccess(true);
    } catch (err: any) {
      setIsSubmitting(false);
      alert(`Error al registrar avistamiento: ${err.message || 'Verificá tu conexión a Supabase'}`);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto shadow-lg shadow-amber-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white">
            ¡Avistamiento Registrado! 🟡
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Tu reporte fue añadido con éxito al mapa y a la línea temporal. ¡Muchas gracias por colaborar!
          </p>
        </div>

        {/* Notificación de WhatsApp al dueño */}
        {registeredPet?.phone && registeredPet.waUrl && (
          <div className="p-5 sm:p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-left space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm">
              <BellRing className="w-5 h-5 text-emerald-600 shrink-0 animate-bounce" />
              <span>Notificación automática de WhatsApp para la familia</span>
            </div>
            <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
              Se preparó el mensaje directo para avisarle a los dueños de <strong>{registeredPet.name}</strong> sobre este avistamiento. Si no se abrió automáticamente, tocal el botón a continuación:
            </p>
            <a
              href={registeredPet.waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 transition-all active:scale-95 text-center cursor-pointer uppercase tracking-wider"
            >
              <MessageCircle className="w-5 h-5" />
              <span>ENVIAR AVISO AHORA POR WHATSAPP</span>
            </a>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <button
            onClick={() => router.push(`/mascota-avistada/${createdSightingId}`)}
            className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Ver Ficha de este Avistamiento</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push('/mapa')}
            className="px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
          >
            Ver en el Mapa 🗺️
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Header */}
      <div className="space-y-2 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Avistamiento o Tránsito
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
          Vi o encontré una mascota
        </h1>
        <p className="text-sm text-zinc-500">
          ¿Viste a un animal deambulando o lo resguardaste en tránsito en tu casa? Registralo acá para que su familia pueda ubicarlo.
        </p>
      </div>

      {Object.keys(formErrors).length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs space-y-1">
          <p className="font-bold">Revisá los siguientes datos:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {Object.values(formErrors).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. ¿DÓNDE ESTÁ EL ANIMAL AHORA? (TRÁNSITO VS CALLE) */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
          <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-2">
            1. ¿Dónde está el animal ahora?
          </h2>

          <div className="space-y-3">
            <label className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
              formData.is_holding === true
                ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-xs'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 hover:border-zinc-300'
            }`}>
              <input
                type="radio"
                name="is_holding"
                checked={formData.is_holding === true}
                onChange={() => setFormData({ ...formData, is_holding: true })}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                  Lo tengo en tránsito en mi casa / patio 🏠
                </span>
                <span className="text-xs text-zinc-500">
                  El animal está a salvo esperando que aparezca su dueño.
                </span>
              </div>
            </label>

            <label className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
              formData.is_holding === false
                ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 shadow-xs'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 hover:border-zinc-300'
            }`}>
              <input
                type="radio"
                name="is_holding"
                checked={formData.is_holding === false}
                onChange={() => setFormData({ ...formData, is_holding: false })}
                className="w-4 h-4 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block">
                  Quedó en la vía pública / no pude retenerlo 🐾
                </span>
                <span className="text-xs text-zinc-500">
                  Fue visto deambulando en el lugar indicado abajo.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
            <h3 className="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300 tracking-wider">
              Datos de Contacto {formData.is_holding ? '(Obligatorio para devolverlo)' : '(Para que te consulten)'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tu nombre o apodo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Marcos / Vecino"
                  value={formData.reporter_name || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reporter_name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Teléfono / WhatsApp de contacto {formData.is_holding && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="tel"
                  placeholder={`Ej: ${region.phoneExampleCompact}`}
                  value={formData.contact_phone || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contact_phone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            <p className="text-[11px] text-zinc-500">
              {formData.is_holding 
                ? '🏠 Este teléfono se mostrará en la ficha para que el dueño se comunique directamente y coordine el reencuentro.' 
                : '🐾 Permite que la familia de la mascota te mande un WhatsApp o te llame para pedirte más datos de hacia dónde se fue.'}
            </p>
          </div>
        </div>

        {/* 2. Selector de Mascota Perdida Vinculada */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-xs">
          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
            2. ¿Reconocés si pertenece a alguna búsqueda activa en {region.provinceName}? (Opcional)
          </label>


          <select
            value={formData.lost_report_id || ''}
            onChange={(e) => setFormData({ ...formData, lost_report_id: e.target.value || null })}
            className="w-full px-3.5 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="">🐾 Mascota no identificada / Avistamiento general</option>
            {activeLostPets.map((p) => (
              <option key={p.id} value={p.id}>
                🐕 {p.name} (Perdido en {p.address})
              </option>
            ))}
          </select>

          {selectedPet && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50">
              {selectedPet.photo_url && (
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-amber-300">
                  <img src={selectedPet.photo_url} alt={selectedPet.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="text-xs">
                <p className="font-bold text-amber-900 dark:text-amber-200">Vinculando avistamiento a {selectedPet.name}</p>
                <p className="text-amber-700 dark:text-amber-400">Se le notificará a su familia al registrar el avistamiento.</p>
              </div>
            </div>
          )}
        </div>

        {/* Foto rápida */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
          <PhotoUploader
            photos={formData.photos || []}
            onChange={(photos) => setFormData({ ...formData, photos })}
            label="Foto del avistamiento (opcional pero muy útil)"
            helperText="Si pudiste tomarle una foto rápida en la calle, subila acá."
          />
        </div>

        {/* Lugar y Dirección */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
          <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-2">
            ¿Dónde y hacia dónde iba?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Calle o Esquina <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: San Martín o 25 de Mayo y Pellegrini"
                value={formData.street_name || formData.approximate_address || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    street_name: val,
                    approximate_address: val,
                  }));
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Fecha y Hora del Avistamiento <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const pad = (n: number) => n.toString().padStart(2, '0');
                  const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                  setFormData((prev) => ({ ...prev, sighting_date: localIso }));
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60 transition-colors cursor-pointer"
              >
                <Clock className="w-3 h-3" />
                Poner actual
              </button>
            </div>
            <input
              type="datetime-local"
              value={formData.sighting_date || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, sighting_date: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Detalle del avistamiento <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Ej: Iba trotando en dirección a la Laguna Chiquichano, tenía collar rojo, se veía cansado pero en buen estado..."
              value={formData.description || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <LocationPicker
            initialLat={formData.latitude}
            initialLng={formData.longitude}
            onLocationChange={(lat, lng, address) => {
              setFormData((prev) => ({
                ...prev,
                latitude: lat,
                longitude: lng,
                ...(address ? { approximate_address: address } : {}),
              }));
            }}
            label={`Marcar punto en el mapa de ${region.provinceName}`}
          />
        </div>

        {/* Submit en color amarillo */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-zinc-950 font-black text-base shadow-xl shadow-amber-400/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border-2 border-amber-500"
        >
          {isSubmitting ? 'Registrando...' : 'REGISTRAR AVISTAMIENTO 🟡'}
        </button>

      </form>
    </div>
  );
}

export default function PublicarAvistamientoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Cargando formulario de avistamiento...</div>}>
      <SightingForm />
    </Suspense>
  );
}
