import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { listAssociationAnimals, requireMyAssociation } from '@/lib/adoption/server';
import { AnimalCard } from '@/components/adoption/AnimalCard';
import { Notice, sp } from '@/components/adoption/Notice';

export const dynamic = 'force-dynamic';

const OK: Record<string, string> = {
  registrada: '¡Asociación registrada! La vamos a revisar y te avisamos. Mientras tanto podés cargar tus animales.',
  eliminado: 'Animal eliminado.',
};

export default async function PanelPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { association } = await requireMyAssociation();
  const animals = await listAssociationAnimals(association.id);
  const okKey = sp(params, 'ok');
  const groups = [
    { title: 'En adopción y reservados', list: animals.filter((a) => a.status !== 'ADOPTED') },
    { title: 'Adoptados', list: animals.filter((a) => a.status === 'ADOPTED') },
  ];

  return (
    <div className="space-y-6">
      <Notice success={okKey ? OK[okKey] : null} error={sp(params, 'e')} />
      <Link href="/asociacion/animales/nuevo" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">
        <Plus className="w-4 h-4" /> Cargar animal
      </Link>
      {animals.length === 0 && <p className="text-sm text-zinc-500">Todavía no cargaste animales.</p>}
      {groups.map(
        (g) =>
          g.list.length > 0 && (
            <section key={g.title} className="space-y-3">
              <h2 className="font-black text-zinc-900 dark:text-white">
                {g.title} ({g.list.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {g.list.map((a) => (
                  <AnimalCard
                    key={a.id}
                    animal={a}
                    href={`/asociacion/animales/${a.id}`}
                    extra={a.pending_requests > 0 ? <p className="text-xs font-black text-rose-600">{a.pending_requests} solicitud(es) nuevas</p> : null}
                  />
                ))}
              </div>
            </section>
          )
      )}
    </div>
  );
}
