import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, AtSign, Mail, MessageCircle, Phone } from 'lucide-react';
import { getPublicAssociationBySlug, listPublicAnimals } from '@/lib/adoption/server';
import { AnimalCard } from '@/components/adoption/AnimalCard';
import { getRegion } from '@/config/regions';
import { formatWhatsAppPhone } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await getPublicAssociationBySlug((await params).slug);
  if (!a) return { title: 'Asociación' };
  return { title: `${a.name} — adopción | ${getRegion(a.region_slug).brandName}`, description: a.description || undefined };
}

export default async function AssociationPage({ params }: { params: Promise<{ slug: string }> }) {
  const association = await getPublicAssociationBySlug((await params).slug);
  if (!association) notFound();
  const animals = await listPublicAnimals({ associationId: association.id });
  const region = getRegion(association.region_slug);
  const wa = association.whatsapp ? formatWhatsAppPhone(association.whatsapp) : '';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link href="/adopcion" className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-500 hover:text-emerald-600">
        <ArrowLeft className="w-4 h-4" /> Volver a adopción
      </Link>
      <header className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-3">
        <div className="flex items-center gap-4">
          {association.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={association.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover bg-white" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center text-3xl">🏠</div>
          )}
          <div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">{association.name}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {association.city}, {region.provinceName}
            </p>
          </div>
        </div>
        {association.description && <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line">{association.description}</p>}
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-white">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          )}
          {association.phone && (
            <a href={`tel:${association.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
              <Phone className="w-3.5 h-3.5" /> {association.phone}
            </a>
          )}
          <a href={`mailto:${association.email}`} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
            <Mail className="w-3.5 h-3.5" /> {association.email}
          </a>
          {association.instagram && (
            <a href={`https://instagram.com/${association.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
              <AtSign className="w-3.5 h-3.5" /> {association.instagram}
            </a>
          )}
        </div>
      </header>

      <h2 className="text-lg font-black text-zinc-900 dark:text-white">En adopción ({animals.length})</h2>
      {animals.length === 0 ? (
        <p className="text-sm text-zinc-500">Por ahora no hay animales publicados.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {animals.map((a) => (
            <AnimalCard key={a.id} animal={a} href={`/adopcion/${a.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
