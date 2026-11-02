import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { getAnimalPanelData, requireOwnAnimal } from '@/lib/adoption/server';
import { REGISTRY_STATUS_LABEL, REQUEST_STATUS_LABEL } from '@/lib/adoption/types';
import { AnimalStatusBadge } from '@/components/adoption/AnimalCard';
import { AnimalForm } from '@/components/adoption/AnimalForm';
import { Card, Field, Notice, sp } from '@/components/adoption/Notice';
import { SubmitButton, inputClass } from '@/components/adoption/FormBits';
import {
  addFollowupAction,
  addVaccineAction,
  approveAdoptionAction,
  deleteAnimalAction,
  deleteHealthItemAction,
  rejectRequestAction,
  setAnimalStatusAction,
  undoAdoptionAction,
  updateRegistryAction,
} from '@/app/adopcion/actions';
import { formatWhatsAppPhone } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const OK: Record<string, string> = {
  creado: 'Animal cargado. Podés sumarle vacunas abajo.',
  guardado: 'Cambios guardados.',
  adoptado: '¡Adopción registrada! Le avisamos por mail a la familia adoptante.',
};

const fmt = (d: string) => new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es-AR');

export default async function PanelAnimalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { animal } = await requireOwnAnimal(id);
  const { vaccines, followups, requests, adoption, adopter } = await getAnimalPanelData(animal.id);
  const pending = requests.filter((r) => r.status === 'PENDING');
  const others = requests.filter((r) => r.status !== 'PENDING');
  const okKey = sp(query, 'ok');
  const today = new Date().toISOString().slice(0, 10);
  const hidden = <input type="hidden" name="animal_id" value={animal.id} />;

  return (
    <div className="space-y-5">
      <Link href="/asociacion" className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-500 hover:text-emerald-600">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>
      <Notice error={sp(query, 'e')} success={okKey ? OK[okKey] : null} />

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-black text-zinc-900 dark:text-white">{animal.name}</h2>
        <AnimalStatusBadge status={animal.status} />
        {animal.status !== 'ADOPTED' && (
          <form action={setAnimalStatusAction} className="flex gap-2">
            {hidden}
            <input type="hidden" name="status" value={animal.status === 'RESERVED' ? 'AVAILABLE' : 'RESERVED'} />
            <SubmitButton variant="ghost">{animal.status === 'RESERVED' ? 'Volver a "En adopción"' : 'Marcar como reservado'}</SubmitButton>
          </form>
        )}
        <Link href={`/adopcion/${animal.id}`} className="text-sm font-bold text-emerald-600 underline">
          Ver ficha pública
        </Link>
      </div>

      {/* Solicitudes */}
      {animal.status !== 'ADOPTED' && (
        <Card id="solicitudes">
          <h3 className="font-black text-zinc-900 dark:text-white">Solicitudes pendientes ({pending.length})</h3>
          {pending.length === 0 && <p className="text-sm text-zinc-500">No hay solicitudes por ahora.</p>}
          <ul className="space-y-3">
            {pending.map((r) => (
              <li key={r.id} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 space-y-2">
                <AdopterInfo adopter={r.adopter} date={r.created_at} message={r.message} animalName={animal.name} />
                <div className="flex flex-wrap gap-2">
                  <form action={approveAdoptionAction}>
                    {hidden}
                    <input type="hidden" name="request_id" value={r.id} />
                    <SubmitButton confirm={`¿Registrar la adopción de ${animal.name} por ${r.adopter?.first_name || 'esta persona'}? Las demás solicitudes se marcan como no aprobadas.`}>
                      Aprobar adopción
                    </SubmitButton>
                  </form>
                  <form action={rejectRequestAction}>
                    {hidden}
                    <input type="hidden" name="request_id" value={r.id} />
                    <SubmitButton variant="ghost">No aprobar</SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          {others.length > 0 && (
            <p className="text-xs text-zinc-500">
              Historial: {others.map((r) => `${r.adopter?.first_name || '—'} (${REQUEST_STATUS_LABEL[r.status]})`).join(', ')}
            </p>
          )}
        </Card>
      )}

      {/* Adopción registrada */}
      {adoption && (
        <Card id="adopcion" className="border-sky-200 dark:border-sky-900">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-black text-zinc-900 dark:text-white">Adopción</h3>
            <Link href={`/asociacion/animales/${animal.id}/ficha`} target="_blank" className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600">
              <Printer className="w-4 h-4" /> Imprimir ficha
            </Link>
          </div>
          <p className="text-sm">
            Ficha <strong className="font-mono">{adoption.record_code}</strong> · {fmt(adoption.adopted_on)}
          </p>
          <AdopterInfo adopter={adopter} animalName={animal.name} />
          <form action={updateRegistryAction} className="grid sm:grid-cols-3 gap-3 items-end">
            {hidden}
            <Field label="Registro oficial de mascotas">
              <select name="registry_status" defaultValue={adoption.registry_status} className={inputClass}>
                {Object.entries(REGISTRY_STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="N° de inscripción">
              <input name="registry_number" maxLength={60} defaultValue={adoption.registry_number || ''} className={inputClass} />
            </Field>
            <SubmitButton variant="ghost">Guardar</SubmitButton>
          </form>
          <form action={undoAdoptionAction}>
            {hidden}
            <SubmitButton variant="ghost" confirm="¿Deshacer la adopción? El animal vuelve a estar en adopción.">
              Deshacer adopción
            </SubmitButton>
          </form>
        </Card>
      )}

      {/* Salud */}
      <div className="grid md:grid-cols-2 gap-5" id="salud">
        <Card>
          <h3 className="font-black text-zinc-900 dark:text-white">💉 Vacunas</h3>
          <ul className="text-sm space-y-1">
            {vaccines.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2">
                <span>
                  {v.name} — {fmt(v.applied_on)}
                  {v.next_due && <span className="text-zinc-500"> (próxima: {fmt(v.next_due)})</span>}
                </span>
                <form action={deleteHealthItemAction}>
                  {hidden}
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="kind" value="vaccine" />
                  <button type="submit" className="text-xs text-rose-600 font-bold">Borrar</button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addVaccineAction} className="grid grid-cols-2 gap-2">
            {hidden}
            <div className="col-span-2">
              <input name="name" required maxLength={80} placeholder="Vacuna (ej: Antirrábica, Séxtuple)" className={inputClass} />
            </div>
            <Field label="Aplicada">
              <input name="applied_on" type="date" required defaultValue={today} className={inputClass} />
            </Field>
            <Field label="Próxima dosis">
              <input name="next_due" type="date" className={inputClass} />
            </Field>
            <SubmitButton variant="ghost" className="col-span-2">Agregar vacuna</SubmitButton>
          </form>
        </Card>

        <Card id="controles">
          <h3 className="font-black text-zinc-900 dark:text-white">📋 Controles y seguimiento</h3>
          <ul className="text-sm space-y-1">
            {followups.map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-2">
                <span>
                  <strong>{fmt(f.date)}:</strong> {f.note}
                </span>
                <form action={deleteHealthItemAction}>
                  {hidden}
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="kind" value="followup" />
                  <button type="submit" className="text-xs text-rose-600 font-bold">Borrar</button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addFollowupAction} className="space-y-2">
            {hidden}
            <input name="date" type="date" required defaultValue={today} className={inputClass} />
            <textarea name="note" required rows={2} maxLength={1000} placeholder="Ej: Visita post-adopción, está muy bien adaptado" className={inputClass} />
            <SubmitButton variant="ghost" className="w-full">Agregar control</SubmitButton>
          </form>
        </Card>
      </div>

      <Card>
        <h3 className="font-black text-zinc-900 dark:text-white">Editar datos</h3>
        <AnimalForm animal={animal} />
      </Card>

      <form action={deleteAnimalAction}>
        {hidden}
        <SubmitButton variant="danger" confirm={`¿Eliminar a ${animal.name}? Se borran también sus vacunas, controles y solicitudes.`}>
          Eliminar animal
        </SubmitButton>
      </form>
    </div>
  );
}

function AdopterInfo({
  adopter,
  date,
  message,
  animalName,
}: {
  adopter: import('@/lib/adoption/types').AdopterProfile | null;
  date?: string;
  message?: string | null;
  animalName: string;
}) {
  if (!adopter) return <p className="text-sm text-zinc-500">La persona todavía no completó su ficha.</p>;
  const wa = formatWhatsAppPhone(adopter.phone);
  return (
    <div className="text-sm space-y-0.5">
      <p className="font-black text-zinc-900 dark:text-white">
        {adopter.first_name} {adopter.last_name} <span className="font-normal text-zinc-500">· DNI {adopter.dni}</span>
      </p>
      <p>
        📍 {adopter.address}
        {adopter.city ? `, ${adopter.city}` : ''}
      </p>
      <p>
        📞 {adopter.phone} · ✉️ {adopter.email}
      </p>
      {date && <p className="text-xs text-zinc-500">Pidió el {fmt(date)}</p>}
      {message && <p className="mt-1 p-2 rounded-lg bg-white dark:bg-zinc-900 italic">“{message}”</p>}
      {wa && (
        <a
          href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hola ${adopter.first_name}! Te escribimos por tu solicitud para adoptar a ${animalName}.`)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-xs font-bold text-emerald-600 underline"
        >
          Escribir por WhatsApp
        </a>
      )}
    </div>
  );
}
