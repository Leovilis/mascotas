import React from 'react';
import Link from 'next/link';
import { HeartHandshake, LogOut } from 'lucide-react';
import { getAdopterProfile, getAssociationByOwner, listMyRequests, requireSessionUser } from '@/lib/adoption/server';
import { ASSOCIATION_STATUS_LABEL, REQUEST_STATUS_LABEL } from '@/lib/adoption/types';
import { Card, Notice, sp } from '@/components/adoption/Notice';
import { SubmitButton } from '@/components/adoption/FormBits';
import { ProfileFields } from '@/components/adoption/ProfileFields';
import { cancelRequestAction, saveProfileAction, signOutAction } from '@/app/adopcion/actions';
import { formatWhatsAppPhone } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mi cuenta' };

const OK: Record<string, string> = {
  perfil: 'Datos guardados.',
  cancelada: 'Solicitud cancelada.',
  clave: 'Contraseña actualizada.',
};

export default async function CuentaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const user = await requireSessionUser('/cuenta');
  const [profile, association, requests] = await Promise.all([
    getAdopterProfile(user.id),
    getAssociationByOwner(user.id),
    listMyRequests(user.id),
  ]);
  const next = sp(params, 'next') || '/cuenta';
  const okKey = sp(params, 'ok');

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Mi cuenta</h1>
          <p className="text-sm text-zinc-500">{user.email}</p>
        </div>
        <form action={signOutAction}>
          <SubmitButton variant="ghost">
            <LogOut className="w-4 h-4" /> Salir
          </SubmitButton>
        </form>
      </header>
      <Notice error={sp(params, 'e')} success={okKey ? OK[okKey] : null} />

      {association ? (
        <Card className="border-emerald-200 dark:border-emerald-900">
          <p className="text-sm">
            Sos responsable de <strong>{association.name}</strong> ({ASSOCIATION_STATUS_LABEL[association.status]}).
          </p>
          <Link href="/asociacion" className="inline-flex px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold w-fit">
            Ir al panel de la asociación
          </Link>
        </Card>
      ) : null}

      <Card>
        <h2 className="font-black text-zinc-900 dark:text-white flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-emerald-500" /> Mis solicitudes de adopción
        </h2>
        {requests.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Todavía no pediste adoptar. <Link href="/adopcion" className="font-bold text-emerald-600 underline">Ver animales en adopción</Link>
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {requests.map((r) => {
              const wa = r.association?.whatsapp ? formatWhatsAppPhone(r.association.whatsapp) : '';
              return (
                <li key={r.id} className="py-3 flex items-center gap-3">
                  {r.animal?.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.animal.photos[0]} alt="" className="w-14 h-14 rounded-xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                  )}
                  <div className="flex-1 min-w-0">
                    <Link href={`/adopcion/${r.animal_id}`} className="font-bold text-zinc-900 dark:text-white hover:text-emerald-600">
                      {r.animal?.name || 'Animal'}
                    </Link>
                    <p className="text-xs text-zinc-500 truncate">{r.association?.name}</p>
                    <p className="text-xs font-bold">{REQUEST_STATUS_LABEL[r.status]}</p>
                    {r.status === 'APPROVED' && wa && (
                      <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-600 underline">
                        Escribir a la asociación
                      </a>
                    )}
                  </div>
                  {r.status === 'PENDING' && (
                    <form action={cancelRequestAction}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <SubmitButton variant="ghost" confirm="¿Cancelar esta solicitud?">
                        Cancelar
                      </SubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <form action={saveProfileAction}>
        <Card>
          <h2 className="font-black text-zinc-900 dark:text-white">{profile ? 'Mis datos' : 'Completá tus datos'}</h2>
          <p className="text-xs text-zinc-500">
            No se publican. Los ve solo la asociación a la que le pedís adoptar (o, si sos responsable de una asociación, el equipo del sitio para verificarla).
          </p>
          <input type="hidden" name="next" value={next} />
          <ProfileFields value={profile} />
          <SubmitButton>Guardar datos</SubmitButton>
        </Card>
      </form>
      <p className="text-xs text-zinc-500">
        ¿Querés cambiar la contraseña? <Link href="/cuenta/nueva-clave" className="font-bold underline">Cambiar contraseña</Link>
      </p>
    </div>
  );
}
