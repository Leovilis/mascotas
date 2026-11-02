import React from 'react';
import Link from 'next/link';
import { listAssociationAdoptions, requireMyAssociation } from '@/lib/adoption/server';
import { REGISTRY_STATUS_LABEL } from '@/lib/adoption/types';

export const dynamic = 'force-dynamic';

export default async function AdopcionesPage() {
  const { association } = await requireMyAssociation();
  const list = await listAssociationAdoptions(association.id);
  if (list.length === 0) return <p className="text-sm text-zinc-500">Todavía no registraste adopciones.</p>;
  const pending = list.filter((a) => a.registry_status === 'PENDING').length;
  return (
    <div className="space-y-3">
      {pending > 0 && (
        <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{pending} adopción(es) pendiente(s) de inscripción en el registro oficial.</p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="p-3">Animal</th>
              <th className="p-3">Adoptante</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Ficha</th>
              <th className="p-3">Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {list.map((a) => (
              <tr key={a.id}>
                <td className="p-3 font-bold">
                  <Link href={`/asociacion/animales/${a.animal_id}#adopcion`} className="hover:text-emerald-600">
                    {a.animal.name}
                  </Link>
                </td>
                <td className="p-3">
                  {a.adopter ? `${a.adopter.first_name} ${a.adopter.last_name}` : '—'}
                  {a.adopter && <span className="block text-xs text-zinc-500">DNI {a.adopter.dni}</span>}
                </td>
                <td className="p-3">{new Date(a.adopted_on + 'T12:00:00').toLocaleDateString('es-AR')}</td>
                <td className="p-3 font-mono text-xs">
                  <Link href={`/asociacion/animales/${a.animal_id}/ficha`} target="_blank" className="underline">
                    {a.record_code}
                  </Link>
                </td>
                <td className="p-3">
                  {REGISTRY_STATUS_LABEL[a.registry_status]}
                  {a.registry_number && <span className="block text-xs text-zinc-500">N° {a.registry_number}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
