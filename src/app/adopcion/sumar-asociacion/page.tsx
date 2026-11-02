import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Home } from 'lucide-react';
import { getServerRegion } from '@/lib/region/server';
import { getAdopterProfile, getAssociationByOwner, getSessionUser } from '@/lib/adoption/server';
import { AssociationFields } from '@/components/adoption/AssociationFields';
import { Card, Notice, sp } from '@/components/adoption/Notice';
import { SubmitButton } from '@/components/adoption/FormBits';
import { registerAssociationAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sumá tu asociación o refugio' };

const HERE = '/adopcion/sumar-asociacion';

export default async function SumarAsociacionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { region } = await getServerRegion();
  const user = await getSessionUser();
  if (user && (await getAssociationByOwner(user.id))) redirect('/asociacion');
  const profile = user ? await getAdopterProfile(user.id) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
          <Home className="w-7 h-7 text-emerald-500" /> Sumá tu asociación o refugio
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Es gratis. Publicás tus animales, recibís solicitudes con los datos de cada adoptante y llevás vacunas, controles y fichas de
          adopción en un solo lugar. Revisamos cada asociación antes de mostrarla al público.
        </p>
      </header>

      <ol className="grid sm:grid-cols-3 gap-2 text-xs font-bold">
        {['1. Creá tu cuenta (persona responsable)', '2. Cargá los datos de la asociación', '3. Te aprobamos y empezás a publicar'].map((s, i) => (
          <li
            key={s}
            className={`p-3 rounded-xl border ${
              (i === 0 && !user) || (i === 1 && user) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'border-zinc-200 dark:border-zinc-800'
            }`}
          >
            {s}
          </li>
        ))}
      </ol>

      {!user ? (
        <Card>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Primero necesitamos una cuenta de la <strong>persona responsable</strong> (nombre, DNI y contacto). Después cargás los datos de la asociación.
          </p>
          <div className="flex gap-2">
            <Link href={`/cuenta/registro?next=${encodeURIComponent(HERE)}`} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold">
              Crear cuenta
            </Link>
            <Link href={`/cuenta/ingresar?next=${encodeURIComponent(HERE)}`} className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-sm font-bold">
              Ya tengo cuenta
            </Link>
          </div>
        </Card>
      ) : !profile ? (
        <Card>
          <p className="text-sm">
            Antes, <Link href={`/cuenta?next=${encodeURIComponent(HERE)}`} className="font-bold text-emerald-600 underline">completá los datos de la persona responsable</Link>.
          </p>
        </Card>
      ) : (
        <form action={registerAssociationAction}>
          <Card>
            <Notice error={sp(params, 'e')} />
            <p className="text-xs text-zinc-500">
              Responsable: <strong>{profile.first_name} {profile.last_name}</strong> (DNI {profile.dni})
            </p>
            <AssociationFields defaultRegion={region.slug} />
            <label className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <input type="checkbox" name="accept" required className="mt-0.5" />
              Declaro que los datos son reales, que los animales que publique están bajo nuestro cuidado y que no cobramos por adoptar
              (salvo una contribución voluntaria o gastos veterinarios informados).
            </label>
            <SubmitButton className="w-full">Enviar para aprobación</SubmitButton>
          </Card>
        </form>
      )}
    </div>
  );
}
