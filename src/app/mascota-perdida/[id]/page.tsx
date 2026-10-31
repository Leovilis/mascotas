import React from 'react';
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MascotaPerdidaSingularRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/mascotas-perdidas/${id}`);
}
