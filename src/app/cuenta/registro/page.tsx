import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerRegion } from '@/lib/region/server';
import { getSessionUser } from '@/lib/adoption/server';
import { Card, Field, Notice, sp } from '@/components/adoption/Notice';
import { SubmitButton, inputClass } from '@/components/adoption/FormBits';
import { ProfileFields } from '@/components/adoption/ProfileFields';
import { signUpAction } from '@/app/adopcion/actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Crear cuenta' };

export default async function RegistroPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = sp(params, 'next') || '/adopcion';
  if (await getSessionUser()) redirect('/cuenta');
  const { region } = await getServerRegion();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
      <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Crear cuenta</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Para adoptar (o registrar una asociación) necesitamos tus datos. <strong>No se publican</strong>: solo los ve la asociación a la que le pedís adoptar.
      </p>
      <Notice error={sp(params, 'e')} />
      <form action={signUpAction}>
        <Card>
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="region_slug" value={region.slug} />
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Email *">
                <input name="email" type="email" required autoComplete="email" maxLength={254} className={inputClass} />
              </Field>
            </div>
            <Field label="Contraseña *" hint="Mínimo 8 caracteres">
              <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
            </Field>
            <Field label="Repetir contraseña *">
              <input name="password2" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
            </Field>
          </div>
          <hr className="border-zinc-200 dark:border-zinc-800" />
          <ProfileFields />
          <label className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <input type="checkbox" name="accept" required className="mt-0.5" />
            Acepto que mis datos se compartan con las asociaciones a las que les pida adoptar, solo para evaluar la adopción.
          </label>
          <SubmitButton className="w-full">Crear cuenta</SubmitButton>
          <p className="text-xs text-center text-zinc-500">
            ¿Ya tenés cuenta? <Link href={`/cuenta/ingresar?next=${encodeURIComponent(next)}`} className="font-bold text-emerald-600">Ingresá</Link>
          </p>
        </Card>
      </form>
    </div>
  );
}
