import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, AtSign, Mail, MessageCircle, Phone, Syringe } from 'lucide-react';
import {
  getAdopterProfile,
  getMyRequestForAnimal,
  getPublicAnimal,
  getSessionUser,
} from '@/lib/adoption/server';
import { REQUEST_STATUS_LABEL, SEX_LABEL, SIZE_LABEL, SPECIES_EMOJI, SPECIES_LABEL } from '@/lib/adoption/types';
import { AnimalStatusBadge } from '@/components/adoption/AnimalCard';
import { Card, Notice, sp } from '@/components/adoption/Notice';
import { SubmitButton, inputClass } from '@/components/adoption/FormBits';
import { requestAdoptionAction } from '../actions';
import { getRegion } from '@/config/regions';
import { formatWhatsAppPhone } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const data = await getPublicAnimal((await params).id);
  if (!data) return { title: 'Adopción' };
  const region = getRegion(data.animal.region_slug);
  return {
    title: `${data.animal.name} busca familia | ${region.brandName}`,
    description: `${SPECIES_LABEL[data.animal.species]} en adopción en ${data.association.city || region.provinceName} — ${data.association.name}`,
    openGraph: data.animal.photos[0] ? { images: [data.animal.photos[0]] } : undefined,
  };
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-AR');
}

export default async function AnimalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const data = await getPublicAnimal(id);
  if (!data) notFound();
  const { animal, association, vaccines } = data;
  const region = getRegion(animal.region_slug);

  const user = await getSessionUser();
  const [profile, myRequest] = user ? await Promise.all([getAdopterProfile(user.id), getMyRequestForAnimal(user.id, animal.id)]) : [null, null];
  const isOwner = user?.id === association.owner_id;
  const wa = association.whatsapp ? formatWhatsAppPhone(association.whatsapp) : '';
  const here = `/adopcion/${animal.id}`;

  const facts = [
    ['Especie', SPECIES_LABEL[animal.species]],
    ['Sexo', SEX_LABEL[animal.sex]],
    ['Edad', animal.age],
    ['Tamaño', animal.size ? SIZE_LABEL[animal.size] : null],
    ['Raza', animal.breed],
    ['Castrado/a', animal.neutered ? 'Sí' : 'No'],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link href="/adopcion" className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-500 hover:text-emerald-600">
        <ArrowLeft className="w-4 h-4" /> Volver a adopción
      </Link>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="aspect-square rounded-3xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            {animal.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={animal.photos[0]} alt={animal.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl">{SPECIES_EMOJI[animal.species]}</div>
            )}
          </div>
          {animal.photos.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {animal.photos.slice(1).map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <AnimalStatusBadge status={animal.status} />
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white">{animal.name}</h1>
            <p className="text-sm text-zinc-500">
              {association.city ? `${association.city}, ` : ''}
              {region.provinceName}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2">
            {facts.map(([k, v]) => (
              <div key={k} className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
                <dt className="text-[10px] font-bold uppercase text-zinc-500">{k}</dt>
                <dd className="text-sm font-bold text-zinc-900 dark:text-white">{v}</dd>
              </div>
            ))}
          </dl>

          {animal.description && <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line">{animal.description}</p>}

          {vaccines.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-black uppercase text-zinc-500 flex items-center gap-1.5">
                <Syringe className="w-3.5 h-3.5" /> Vacunas
              </p>
              <ul className="text-sm text-zinc-700 dark:text-zinc-300 space-y-0.5">
                {vaccines.map((v) => (
                  <li key={v.id}>
                    ✓ {v.name} <span className="text-zinc-500">({fmtDate(v.applied_on)})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Solicitud */}
          <Card id="solicitar" className="border-emerald-200 dark:border-emerald-900">
            <Notice
              error={sp(query, 'e')}
              success={sp(query, 'sent') ? `¡Listo! Mandamos tu solicitud a ${association.name}. Te van a contactar.` : null}
            />
            {isOwner ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Este animal es de tu asociación. <Link href={`/asociacion/animales/${animal.id}`} className="font-bold text-emerald-600 underline">Gestionarlo</Link>
              </p>
            ) : myRequest && myRequest.status !== 'CANCELLED' ? (
              <p className="text-sm">
                Tu solicitud: <strong>{REQUEST_STATUS_LABEL[myRequest.status]}</strong>.{' '}
                <Link href="/cuenta" className="font-bold text-emerald-600 underline">Ver mis solicitudes</Link>
              </p>
            ) : animal.status !== 'AVAILABLE' ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {animal.status === 'RESERVED' ? 'Este animal está reservado: la asociación está evaluando una adopción.' : 'Este animal ya fue adoptado. 💚'}
              </p>
            ) : !user ? (
              <div className="space-y-2">
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">¿Querés adoptar a {animal.name}?</p>
                <p className="text-xs text-zinc-500">Necesitás una cuenta para que la asociación pueda conocerte y contactarte.</p>
                <div className="flex gap-2">
                  <Link href={`/cuenta/registro?next=${encodeURIComponent(here)}`} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold">Crear cuenta</Link>
                  <Link href={`/cuenta/ingresar?next=${encodeURIComponent(here)}`} className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-sm font-bold">Ya tengo cuenta</Link>
                </div>
              </div>
            ) : !profile ? (
              <p className="text-sm">
                Para pedir una adopción, <Link href={`/cuenta?next=${encodeURIComponent(here)}`} className="font-bold text-emerald-600 underline">completá tu ficha</Link> (nombre, DNI, teléfono y domicilio).
              </p>
            ) : (
              <form action={requestAdoptionAction} className="space-y-3">
                <input type="hidden" name="animal_id" value={animal.id} />
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Quiero adoptar a {animal.name}</p>
                <textarea
                  name="message"
                  rows={3}
                  maxLength={1000}
                  placeholder="Contale a la asociación sobre tu casa, si tenés patio, otros animales, quiénes viven con vos…"
                  className={inputClass}
                />
                <p className="text-[11px] text-zinc-500">
                  La asociación va a ver tu nombre, DNI, teléfono, email y domicilio para evaluar la adopción.
                </p>
                <SubmitButton className="w-full">Enviar solicitud</SubmitButton>
              </form>
            )}
          </Card>

          {/* Asociación */}
          <Card>
            <div>
              <p className="text-[10px] font-black uppercase text-zinc-500">Publicado por</p>
              <Link href={`/adopcion/asociaciones/${association.slug}`} className="font-black text-lg text-zinc-900 dark:text-white hover:text-emerald-600">
                🏠 {association.name}
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {wa && (
                <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hola! Vi a ${animal.name} en ${region.brandName} y quiero saber más.`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-white">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              )}
              {association.phone && (
                <a href={`tel:${association.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700">
                  <Phone className="w-3.5 h-3.5" /> {association.phone}
                </a>
              )}
              <a href={`mailto:${association.email}`} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700">
                <Mail className="w-3.5 h-3.5" /> Email
              </a>
              {association.instagram && (
                <a href={`https://instagram.com/${association.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700">
                  <AtSign className="w-3.5 h-3.5" /> @{association.instagram}
                </a>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
