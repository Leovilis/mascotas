import React from 'react';
import { requireSessionUser } from '@/lib/adoption/server';
import { Card, Field, Notice, sp } from '@/components/adoption/Notice';
import { SubmitButton, inputClass } from '@/components/adoption/FormBits';
import { updatePasswordAction } from '@/app/adopcion/actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nueva contraseña' };

export default async function NuevaClavePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSessionUser('/cuenta/nueva-clave');
  const params = await searchParams;
  return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-4">
      <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Nueva contraseña</h1>
      <Notice error={sp(params, 'e')} />
      <form action={updatePasswordAction}>
        <Card>
          <Field label="Contraseña nueva" hint="Mínimo 8 caracteres">
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          </Field>
          <Field label="Repetir contraseña">
            <input name="password2" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          </Field>
          <SubmitButton className="w-full">Guardar</SubmitButton>
        </Card>
      </form>
    </div>
  );
}
