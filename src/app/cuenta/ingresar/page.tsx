import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/adoption/server';
import { Card, Field, Notice, sp } from '@/components/adoption/Notice';
import { SubmitButton, inputClass } from '@/components/adoption/FormBits';
import { resetPasswordAction, signInAction } from '@/app/adopcion/actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ingresar' };

const OK: Record<string, string> = {
  confirmar: '¡Cuenta creada! Te mandamos un mail para confirmarla. Abrí el link y después ingresá acá.',
  recuperar: 'Si hay una cuenta con ese email, te mandamos un link para crear una contraseña nueva.',
};

export default async function IngresarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = sp(params, 'next') || '/cuenta';
  const recover = sp(params, 'modo') === 'recuperar';
  const okKey = sp(params, 'ok');
  if (await getSessionUser()) redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/cuenta');

  return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-4">
      <h1 className="text-2xl font-black text-zinc-900 dark:text-white">{recover ? 'Recuperar contraseña' : 'Ingresar'}</h1>
      <Notice error={sp(params, 'e')} success={okKey ? OK[okKey] : null} />
      <Card>
        {recover ? (
          <form action={resetPasswordAction} className="space-y-4">
            <Field label="Email de tu cuenta">
              <input name="email" type="email" required autoComplete="email" className={inputClass} />
            </Field>
            <SubmitButton className="w-full">Enviarme el link</SubmitButton>
            <Link href={`/cuenta/ingresar?next=${encodeURIComponent(next)}`} className="block text-center text-xs font-bold text-zinc-500">
              Volver
            </Link>
          </form>
        ) : (
          <form action={signInAction} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <Field label="Email">
              <input name="email" type="email" required autoComplete="email" className={inputClass} />
            </Field>
            <Field label="Contraseña">
              <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
            </Field>
            <SubmitButton className="w-full">Ingresar</SubmitButton>
            <div className="flex justify-between text-xs font-bold">
              <Link href={`/cuenta/registro?next=${encodeURIComponent(next)}`} className="text-emerald-600">Crear cuenta</Link>
              <Link href={`/cuenta/ingresar?modo=recuperar&next=${encodeURIComponent(next)}`} className="text-zinc-500">Olvidé mi contraseña</Link>
            </div>
          </form>
        )}
      </Card>
      <p className="text-xs text-zinc-500 text-center">
        La cuenta es solo para adopción. Para publicar una mascota perdida o un avistamiento no hace falta.
      </p>
    </div>
  );
}
