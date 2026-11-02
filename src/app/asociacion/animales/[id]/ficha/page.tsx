import React from 'react';
import { notFound } from 'next/navigation';
import { getAnimalPanelData, requireOwnAnimal } from '@/lib/adoption/server';
import { REGISTRY_STATUS_LABEL, SEX_LABEL, SPECIES_LABEL } from '@/lib/adoption/types';
import { getRegion } from '@/config/regions';
import { PrintButton } from '@/components/adoption/PrintButton';

export const dynamic = 'force-dynamic';

const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-AR');

/** Ficha de adopción imprimible (para la asociación, la familia y el registro oficial) */
export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { animal, association } = await requireOwnAnimal(id);
  const { adoption, adopter, vaccines } = await getAnimalPanelData(animal.id);
  if (!adoption || !adopter) notFound();
  const region = getRegion(association.region_slug);
  const row = (k: string, v: React.ReactNode) => (
    <tr>
      <th className="text-left align-top pr-4 py-1 text-zinc-500 font-semibold w-48">{k}</th>
      <td className="py-1">{v}</td>
    </tr>
  );
  return (
    <div className="max-w-3xl mx-auto bg-white text-zinc-900 p-8 space-y-6 print:p-0">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase font-bold text-zinc-500">{region.brandName} · Adopción responsable</p>
          <h1 className="text-2xl font-black">Ficha de adopción</h1>
          <p className="font-mono text-sm">{adoption.record_code}</p>
        </div>
        <PrintButton />
      </div>
      <section>
        <h2 className="font-black border-b mb-2">Animal</h2>
        <table className="text-sm">
          <tbody>
            {row('Nombre', animal.name)}
            {row('Especie / sexo', `${SPECIES_LABEL[animal.species]} · ${SEX_LABEL[animal.sex]}`)}
            {row('Edad / raza', [animal.age, animal.breed].filter(Boolean).join(' · ') || '—')}
            {row('Castrado/a', animal.neutered ? 'Sí' : 'No')}
            {row('Vacunas', vaccines.length ? vaccines.map((v) => `${v.name} (${fmt(v.applied_on)})`).join(', ') : '—')}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="font-black border-b mb-2">Adoptante</h2>
        <table className="text-sm">
          <tbody>
            {row('Nombre y apellido', `${adopter.first_name} ${adopter.last_name}`)}
            {row('DNI', adopter.dni)}
            {row('Domicilio', `${adopter.address}${adopter.city ? `, ${adopter.city}` : ''}`)}
            {row('Teléfono / email', `${adopter.phone} · ${adopter.email}`)}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="font-black border-b mb-2">Asociación</h2>
        <table className="text-sm">
          <tbody>
            {row('Nombre', association.name)}
            {row('Ciudad', `${association.city || ''}, ${region.provinceName}`)}
            {row('Contacto', [association.phone, association.whatsapp, association.email].filter(Boolean).join(' · '))}
            {row('Fecha de adopción', fmt(adoption.adopted_on))}
            {row('Registro oficial', `${REGISTRY_STATUS_LABEL[adoption.registry_status]}${adoption.registry_number ? ` — N° ${adoption.registry_number}` : ''}`)}
          </tbody>
        </table>
      </section>
      <p className="text-xs text-zinc-600">
        La persona adoptante se compromete a brindar alimento, agua, refugio, atención veterinaria y vacunación, a no abandonar ni ceder el
        animal sin avisar a la asociación, y a permitir controles de seguimiento.
      </p>
      <div className="grid grid-cols-2 gap-10 pt-12 text-xs text-center">
        <div className="border-t pt-1">Firma adoptante</div>
        <div className="border-t pt-1">Firma asociación</div>
      </div>
    </div>
  );
}
