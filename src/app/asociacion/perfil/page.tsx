import React from 'react';
import { requireMyAssociation } from '@/lib/adoption/server';
import { AssociationFields } from '@/components/adoption/AssociationFields';
import { Card, Field, Notice, sp } from '@/components/adoption/Notice';
import { SubmitButton } from '@/components/adoption/FormBits';
import { saveAssociationAction } from '@/app/adopcion/actions';
import { LogoField } from '@/components/adoption/LogoField';

export const dynamic = 'force-dynamic';

export default async function PerfilAsociacionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { association } = await requireMyAssociation();
  return (
    <form action={saveAssociationAction}>
      <Card>
        <Notice error={sp(params, 'e')} success={sp(params, 'ok') ? 'Datos guardados.' : null} />
        <Field label="Logo">
          <LogoField initial={association.logo_url} />
        </Field>
        <AssociationFields value={association} defaultRegion={association.region_slug} lockRegion={association.status === 'APPROVED'} />
        <SubmitButton>Guardar</SubmitButton>
      </Card>
    </form>
  );
}
