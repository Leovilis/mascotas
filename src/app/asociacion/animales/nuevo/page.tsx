import React from 'react';
import { requireMyAssociation } from '@/lib/adoption/server';
import { AnimalForm } from '@/components/adoption/AnimalForm';
import { Card, Notice, sp } from '@/components/adoption/Notice';

export const dynamic = 'force-dynamic';

export default async function NuevoAnimalPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireMyAssociation();
  const params = await searchParams;
  return (
    <Card>
      <h2 className="font-black text-lg text-zinc-900 dark:text-white">Cargar animal</h2>
      <Notice error={sp(params, 'e')} />
      <AnimalForm />
    </Card>
  );
}
