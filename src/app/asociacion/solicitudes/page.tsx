import React from 'react';
import Link from 'next/link';
import { listAssociationRequests, requireMyAssociation } from '@/lib/adoption/server';
import { Card } from '@/components/adoption/Notice';
import { SubmitButton } from '@/components/adoption/FormBits';
import { rejectRequestAction } from '@/app/adopcion/actions';
import { formatWhatsAppPhone } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SolicitudesPage() {
  const { association } = await requireMyAssociation();
  const requests = await listAssociationRequests(association.id);
  if (requests.length === 0) return <p className="text-sm text-zinc-500">No hay solicitudes pendientes.</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">Para aprobar una adopción, entrá a la ficha del animal.</p>
      {requests.map((r) => {
        const wa = r.adopter ? formatWhatsAppPhone(r.adopter.phone) : '';
        return (
          <Card key={r.id} className="!space-y-2">
            <div className="flex items-center gap-3">
              {r.animal?.photos?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.animal.photos[0]} alt="" className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
              )}
              <div className="flex-1">
                <Link href={`/asociacion/animales/${r.animal_id}#solicitudes`} className="font-black text-zinc-900 dark:text-white hover:text-emerald-600">
                  {r.animal?.name}
                </Link>
                <p className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleDateString('es-AR')}</p>
              </div>
            </div>
            {r.adopter ? (
              <div className="text-sm">
                <p className="font-bold">
                  {r.adopter.first_name} {r.adopter.last_name} <span className="font-normal text-zinc-500">· DNI {r.adopter.dni}</span>
                </p>
                <p>📍 {r.adopter.address}{r.adopter.city ? `, ${r.adopter.city}` : ''} · 📞 {r.adopter.phone} · ✉️ {r.adopter.email}</p>
                {r.message && <p className="mt-1 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 italic">“{r.message}”</p>}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Sin ficha completa.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Link href={`/asociacion/animales/${r.animal_id}#solicitudes`} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold">
                Revisar y aprobar
              </Link>
              {wa && (
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-sm font-bold">
                  WhatsApp
                </a>
              )}
              <form action={rejectRequestAction}>
                <input type="hidden" name="animal_id" value={r.animal_id} />
                <input type="hidden" name="request_id" value={r.id} />
                <input type="hidden" name="from" value="solicitudes" />
                <SubmitButton variant="ghost">No aprobar</SubmitButton>
              </form>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
