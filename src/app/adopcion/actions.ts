'use server';

import { randomBytes } from 'crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { getRegion, isRegionSlug } from '@/config/regions';
import { isOwnStorageUrl } from '@/lib/storage-url';
import { emailButton, emailLayout, escapeHtml, sendEmail } from '@/lib/email';
import {
  adopterProfileSchema,
  animalSchema,
  associationSchema,
  dateSchema,
  emailSchema,
  passwordSchema,
} from '@/lib/validations/adoption.schema';
import {
  UUID_RE,
  db,
  getAdopterProfile,
  getAssociationByOwner,
  requireMyAssociation,
  requireOwnAnimal,
  requireSessionUser,
} from '@/lib/adoption/server';
import type { AdoptionAnimal, AdoptionRequest, Association } from '@/lib/adoption/types';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

/** Solo rutas internas para ?next= (evita redirecciones a otros sitios) */
function safeNext(value: string, fallback = '/cuenta'): string {
  return value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

function back(path: string, error: string): never {
  const sep = path.includes('?') ? '&' : '?';
  redirect(`${path}${sep}e=${encodeURIComponent(error)}`);
}

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || 'https';
  return host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || '';
}

function slugify(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'asociacion'
  );
}

function firstIssue(err: { issues: { message: string }[] }): string {
  return err.issues[0]?.message || 'Datos inválidos';
}

// ---------------------------------------------------------------------------
// Cuentas (Supabase Auth)
// ---------------------------------------------------------------------------

export async function signUpAction(form: FormData) {
  const next = safeNext(str(form, 'next'));
  const path = `/cuenta/registro?next=${encodeURIComponent(next)}`;
  const email = emailSchema.safeParse(str(form, 'email'));
  if (!email.success) back(path, firstIssue(email.error));
  const password = passwordSchema.safeParse(String(form.get('password') ?? ''));
  if (!password.success) back(path, firstIssue(password.error));
  if (String(form.get('password')) !== String(form.get('password2'))) back(path, 'Las contraseñas no coinciden');
  const profile = adopterProfileSchema.safeParse({
    first_name: str(form, 'first_name'),
    last_name: str(form, 'last_name'),
    dni: str(form, 'dni'),
    phone: str(form, 'phone'),
    address: str(form, 'address'),
    city: str(form, 'city'),
  });
  if (!profile.success) back(path, firstIssue(profile.error));
  if (form.get('accept') !== 'on') back(path, 'Tenés que aceptar el uso de tus datos para la adopción');

  const admin = db();
  const { data: dniTaken } = await admin.from('adopter_profiles').select('user_id').eq('dni', profile.data.dni).maybeSingle();
  if (dniTaken) back(path, 'Ya hay una cuenta con ese DNI. Ingresá con tu email o recuperá la contraseña.');

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { full_name: `${profile.data.first_name} ${profile.data.last_name}` },
    },
  });
  if (error || !data.user) {
    console.error('[adopcion] signUp:', error?.message);
    back(path, /registered|exists/i.test(error?.message || '') ? 'Ya existe una cuenta con ese email' : 'No se pudo crear la cuenta. Probá de nuevo.');
  }
  // Si el email ya estaba registrado, Supabase devuelve un usuario "vacío" (sin identidades)
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    back(path, 'Ya existe una cuenta con ese email. Ingresá o recuperá tu contraseña.');
  }

  const { error: profileError } = await admin.from('adopter_profiles').upsert({
    user_id: data.user.id,
    ...profile.data,
    email: email.data,
    region_slug: str(form, 'region_slug') || null,
  });
  if (profileError) {
    console.error('[adopcion] perfil:', profileError.message);
    back(path, 'Se creó la cuenta pero no se pudo guardar tu ficha. Ingresá y completala en "Mi cuenta".');
  }

  if (data.session) redirect(next);
  redirect(`/cuenta/ingresar?ok=confirmar&next=${encodeURIComponent(next)}`);
}

export async function signInAction(form: FormData) {
  const next = safeNext(str(form, 'next'));
  const path = `/cuenta/ingresar?next=${encodeURIComponent(next)}`;
  const email = emailSchema.safeParse(str(form, 'email'));
  if (!email.success) back(path, firstIssue(email.error));
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password: String(form.get('password') ?? '') });
  if (error) {
    if (/confirm/i.test(error.message)) back(path, 'Todavía no confirmaste tu email. Revisá tu correo (y la carpeta de spam).');
    back(path, 'Email o contraseña incorrectos');
  }
  redirect(next);
}

export async function signOutAction() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect('/adopcion');
}

export async function resetPasswordAction(form: FormData) {
  const email = emailSchema.safeParse(str(form, 'email'));
  if (!email.success) back('/cuenta/ingresar?modo=recuperar', firstIssue(email.error));
  const supabase = await createServerSupabase();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent('/cuenta/nueva-clave')}`,
  });
  // Misma respuesta exista o no la cuenta
  redirect('/cuenta/ingresar?ok=recuperar');
}

export async function updatePasswordAction(form: FormData) {
  await requireSessionUser('/cuenta/nueva-clave');
  const password = passwordSchema.safeParse(String(form.get('password') ?? ''));
  if (!password.success) back('/cuenta/nueva-clave', firstIssue(password.error));
  if (String(form.get('password')) !== String(form.get('password2'))) back('/cuenta/nueva-clave', 'Las contraseñas no coinciden');
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) back('/cuenta/nueva-clave', 'No se pudo cambiar la contraseña. Pedí un link nuevo.');
  redirect('/cuenta?ok=clave');
}

/** Crea o actualiza la ficha del adoptante */
export async function saveProfileAction(form: FormData) {
  const user = await requireSessionUser('/cuenta');
  const next = safeNext(str(form, 'next'), '/cuenta');
  const path = `/cuenta?next=${encodeURIComponent(next)}`;
  const profile = adopterProfileSchema.safeParse({
    first_name: str(form, 'first_name'),
    last_name: str(form, 'last_name'),
    dni: str(form, 'dni'),
    phone: str(form, 'phone'),
    address: str(form, 'address'),
    city: str(form, 'city'),
  });
  if (!profile.success) back(path, firstIssue(profile.error));
  const admin = db();
  const { data: dniOwner } = await admin.from('adopter_profiles').select('user_id').eq('dni', profile.data.dni).maybeSingle();
  if (dniOwner && dniOwner.user_id !== user.id) back(path, 'Ese DNI ya está registrado en otra cuenta');
  const { error } = await admin.from('adopter_profiles').upsert({ user_id: user.id, ...profile.data, email: user.email });
  if (error) back(path, 'No se pudo guardar tu ficha');
  redirect(next === '/cuenta' ? '/cuenta?ok=perfil' : next);
}

// ---------------------------------------------------------------------------
// Solicitudes de adopción (adoptante)
// ---------------------------------------------------------------------------

export async function requestAdoptionAction(form: FormData) {
  const animalId = str(form, 'animal_id');
  if (!UUID_RE.test(animalId)) redirect('/adopcion');
  const path = `/adopcion/${animalId}`;
  const user = await requireSessionUser(path);
  const profile = await getAdopterProfile(user.id);
  if (!profile) redirect(`/cuenta?next=${encodeURIComponent(path)}&e=${encodeURIComponent('Completá tu ficha antes de pedir una adopción')}`);
  const message = str(form, 'message').slice(0, 1000) || null;

  const admin = db();
  const { data: animal } = await admin.from('adoption_animals').select('*').eq('id', animalId).maybeSingle();
  if (!animal) redirect('/adopcion');
  const a = animal as AdoptionAnimal;
  const { data: assoc } = await admin.from('adoption_associations').select('*').eq('id', a.association_id).eq('status', 'APPROVED').maybeSingle();
  if (!assoc) redirect('/adopcion');
  const association = assoc as Association;
  if (association.owner_id === user.id) back(path, 'No podés pedir adoptar un animal de tu propia asociación');
  if (a.status !== 'AVAILABLE') back(path, 'Este animal ya no está disponible para nuevas solicitudes');

  const { count } = await admin.from('adoption_requests').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'PENDING');
  if ((count ?? 0) >= 5) back(path, 'Tenés 5 solicitudes en revisión. Esperá la respuesta de alguna antes de pedir otra.');

  const { data: existing } = await admin.from('adoption_requests').select('*').eq('animal_id', animalId).eq('user_id', user.id).maybeSingle();
  if (existing) {
    const ex = existing as AdoptionRequest;
    if (ex.status === 'PENDING') redirect(`${path}?sent=1`);
    if (ex.status !== 'CANCELLED') back(path, 'Ya enviaste una solicitud para este animal');
    await admin.from('adoption_requests').update({ status: 'PENDING', message, created_at: new Date().toISOString() }).eq('id', ex.id);
  } else {
    const { error } = await admin.from('adoption_requests').insert({ animal_id: animalId, user_id: user.id, message });
    if (error) back(path, 'No se pudo enviar la solicitud');
  }

  // Aviso por mail a la asociación (no bloquea si falla)
  const site = await origin();
  const brand = getRegion(association.region_slug).brandName;
  await sendEmail({
    to: association.email,
    subject: `Nueva solicitud de adopción para ${a.name}`,
    html: emailLayout({
      brand,
      title: `Nueva solicitud para ${escapeHtml(a.name)}`,
      bodyHtml: `<p><strong>${escapeHtml(profile.first_name)} ${escapeHtml(profile.last_name)}</strong> quiere adoptar a ${escapeHtml(a.name)}.</p>
${message ? `<p style="background:#f4f4f5;padding:12px;border-radius:8px">${escapeHtml(message)}</p>` : ''}
<p>Sus datos de contacto están en tu panel.</p>${emailButton(`${site}/asociacion/solicitudes`, 'Ver solicitudes')}`,
    }),
    text: `${profile.first_name} ${profile.last_name} quiere adoptar a ${a.name}. Mirá la solicitud en ${site}/asociacion/solicitudes`,
  });

  revalidatePath('/asociacion/solicitudes');
  redirect(`${path}?sent=1`);
}

export async function cancelRequestAction(form: FormData) {
  const user = await requireSessionUser('/cuenta');
  const id = str(form, 'request_id');
  if (UUID_RE.test(id)) {
    await db().from('adoption_requests').update({ status: 'CANCELLED' }).eq('id', id).eq('user_id', user.id).eq('status', 'PENDING');
  }
  revalidatePath('/cuenta');
  redirect('/cuenta?ok=cancelada');
}

// ---------------------------------------------------------------------------
// Asociaciones
// ---------------------------------------------------------------------------

function parseAssociation(form: FormData) {
  return associationSchema.safeParse({
    name: str(form, 'name'),
    description: str(form, 'description'),
    city: str(form, 'city'),
    region_slug: str(form, 'region_slug'),
    phone: str(form, 'phone'),
    whatsapp: str(form, 'whatsapp'),
    email: str(form, 'email'),
    instagram: str(form, 'instagram'),
  });
}

export async function registerAssociationAction(form: FormData) {
  const path = '/adopcion/sumar-asociacion';
  const user = await requireSessionUser(path);
  if (await getAssociationByOwner(user.id)) redirect('/asociacion');
  const profile = await getAdopterProfile(user.id);
  if (!profile) redirect(`/cuenta?next=${encodeURIComponent(path)}&e=${encodeURIComponent('Primero completá los datos de la persona responsable')}`);
  const parsed = parseAssociation(form);
  if (!parsed.success) back(path, firstIssue(parsed.error));
  if (!isRegionSlug(parsed.data.region_slug)) back(path, 'Elegí una provincia válida');
  if (form.get('accept') !== 'on') back(path, 'Tenés que aceptar las condiciones');

  const admin = db();
  const base = slugify(parsed.data.name);
  let slug = base;
  for (let n = 2; n < 50; n++) {
    const { data } = await admin.from('adoption_associations').select('id').eq('slug', slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${n}`;
  }
  const { error } = await admin.from('adoption_associations').insert({ ...parsed.data, slug, owner_id: user.id, status: 'PENDING' });
  if (error) {
    console.error('[adopcion] alta asociación:', error.message);
    back(path, 'No se pudo registrar la asociación');
  }

  // Aviso al administrador del sitio (si hay mail de contacto configurado)
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.NEXT_PUBLIC_PARTNER_CONTACT_EMAIL;
  if (adminEmail) {
    const site = await origin();
    await sendEmail({
      to: adminEmail,
      subject: `Nueva asociación para aprobar: ${parsed.data.name}`,
      html: emailLayout({
        brand: getRegion(parsed.data.region_slug).brandName,
        title: 'Nueva asociación pendiente',
        bodyHtml: `<p><strong>${escapeHtml(parsed.data.name)}</strong> (${escapeHtml(parsed.data.city)}, ${escapeHtml(getRegion(parsed.data.region_slug).provinceName)}) pidió sumarse.</p>
<p>Responsable: ${escapeHtml(profile.first_name)} ${escapeHtml(profile.last_name)} — ${escapeHtml(profile.phone)}</p>${emailButton(`${site}/admin/asociaciones`, 'Revisar')}`,
      }),
      text: `${parsed.data.name} pidió sumarse. Revisala en ${site}/admin/asociaciones`,
    });
  }
  redirect('/asociacion?ok=registrada');
}

export async function saveAssociationAction(form: FormData) {
  const { association } = await requireMyAssociation();
  const parsed = parseAssociation(form);
  if (!parsed.success) back('/asociacion/perfil', firstIssue(parsed.error));
  // La provincia no se cambia sola una vez aprobada (evita mover la asociación a otra provincia)
  const region_slug = association.status === 'APPROVED' ? association.region_slug : parsed.data.region_slug;
  if (!isRegionSlug(region_slug)) back('/asociacion/perfil', 'Provincia inválida');
  const logo = str(form, 'logo_url');
  const { error } = await db()
    .from('adoption_associations')
    .update({ ...parsed.data, region_slug, logo_url: isOwnStorageUrl(logo) ? logo : association.logo_url })
    .eq('id', association.id);
  if (error) back('/asociacion/perfil', 'No se pudo guardar');
  await db().from('adoption_animals').update({ region_slug }).eq('association_id', association.id);
  revalidatePath('/adopcion');
  redirect('/asociacion/perfil?ok=1');
}

// ---------------------------------------------------------------------------
// Animales (panel de la asociación)
// ---------------------------------------------------------------------------

export async function saveAnimalAction(form: FormData) {
  const { association } = await requireMyAssociation();
  const id = str(form, 'id');
  const path = id ? `/asociacion/animales/${id}` : '/asociacion/animales/nuevo';
  let photos: unknown = [];
  try {
    photos = JSON.parse(str(form, 'photos') || '[]');
  } catch {}
  const parsed = animalSchema.safeParse({
    name: str(form, 'name'),
    species: str(form, 'species'),
    breed: str(form, 'breed'),
    sex: str(form, 'sex') || 'unknown',
    size: str(form, 'size'),
    age: str(form, 'age'),
    description: str(form, 'description'),
    neutered: form.get('neutered') === 'on',
    photos: Array.isArray(photos) ? photos : [],
  });
  if (!parsed.success) back(path, firstIssue(parsed.error));
  if (!parsed.data.photos.every((u) => isOwnStorageUrl(u))) back(path, 'Las fotos deben subirse desde el formulario');

  const admin = db();
  if (id) {
    const { animal } = await requireOwnAnimal(id);
    const { error } = await admin.from('adoption_animals').update(parsed.data).eq('id', animal.id).eq('association_id', association.id);
    if (error) back(path, 'No se pudo guardar');
    revalidatePath(`/adopcion/${animal.id}`);
    redirect(`/asociacion/animales/${animal.id}?ok=guardado`);
  }
  const { count } = await admin.from('adoption_animals').select('id', { count: 'exact', head: true }).eq('association_id', association.id).neq('status', 'ADOPTED');
  if ((count ?? 0) >= 200) back(path, 'Llegaste al máximo de 200 animales activos');
  const { data, error } = await admin
    .from('adoption_animals')
    .insert({ ...parsed.data, association_id: association.id, region_slug: association.region_slug })
    .select('id')
    .single();
  if (error || !data) back(path, 'No se pudo cargar el animal');
  revalidatePath('/adopcion');
  redirect(`/asociacion/animales/${data.id}?ok=creado`);
}

export async function setAnimalStatusAction(form: FormData) {
  const { animal } = await requireOwnAnimal(str(form, 'animal_id'));
  const status = str(form, 'status');
  if ((status === 'AVAILABLE' || status === 'RESERVED') && animal.status !== 'ADOPTED') {
    await db().from('adoption_animals').update({ status }).eq('id', animal.id);
  }
  revalidatePath(`/asociacion/animales/${animal.id}`);
  revalidatePath('/adopcion');
  redirect(`/asociacion/animales/${animal.id}`);
}

export async function deleteAnimalAction(form: FormData) {
  const { animal } = await requireOwnAnimal(str(form, 'animal_id'));
  await db().from('adoption_animals').delete().eq('id', animal.id);
  revalidatePath('/adopcion');
  redirect('/asociacion?ok=eliminado');
}

export async function addVaccineAction(form: FormData) {
  const { animal } = await requireOwnAnimal(str(form, 'animal_id'));
  const path = `/asociacion/animales/${animal.id}`;
  const name = str(form, 'name').slice(0, 80);
  const applied = dateSchema.safeParse(str(form, 'applied_on'));
  const nextDue = str(form, 'next_due');
  if (!name || !applied.success) back(path, 'Completá la vacuna y la fecha');
  await db()
    .from('adoption_vaccines')
    .insert({ animal_id: animal.id, name, applied_on: applied.data, next_due: dateSchema.safeParse(nextDue).success ? nextDue : null });
  revalidatePath(path);
  redirect(`${path}#salud`);
}

export async function addFollowupAction(form: FormData) {
  const { animal } = await requireOwnAnimal(str(form, 'animal_id'));
  const path = `/asociacion/animales/${animal.id}`;
  const date = dateSchema.safeParse(str(form, 'date'));
  const note = str(form, 'note').slice(0, 1000);
  if (!date.success || !note) back(path, 'Completá la fecha y la nota del control');
  await db().from('adoption_followups').insert({ animal_id: animal.id, date: date.data, note });
  revalidatePath(path);
  redirect(`${path}#controles`);
}

export async function deleteHealthItemAction(form: FormData) {
  const { animal } = await requireOwnAnimal(str(form, 'animal_id'));
  const id = str(form, 'id');
  const table = str(form, 'kind') === 'vaccine' ? 'adoption_vaccines' : 'adoption_followups';
  if (UUID_RE.test(id)) await db().from(table).delete().eq('id', id).eq('animal_id', animal.id);
  revalidatePath(`/asociacion/animales/${animal.id}`);
  redirect(`/asociacion/animales/${animal.id}#salud`);
}

// ---------------------------------------------------------------------------
// Solicitudes y adopciones (panel de la asociación)
// ---------------------------------------------------------------------------

async function ownRequest(form: FormData) {
  const { animal, association } = await requireOwnAnimal(str(form, 'animal_id'));
  const requestId = str(form, 'request_id');
  if (!UUID_RE.test(requestId)) redirect(`/asociacion/animales/${animal.id}`);
  const { data } = await db().from('adoption_requests').select('*').eq('id', requestId).eq('animal_id', animal.id).maybeSingle();
  if (!data) redirect(`/asociacion/animales/${animal.id}`);
  return { animal, association, request: data as AdoptionRequest };
}

export async function rejectRequestAction(form: FormData) {
  const { animal, request } = await ownRequest(form);
  await db().from('adoption_requests').update({ status: 'REJECTED' }).eq('id', request.id).eq('status', 'PENDING');
  revalidatePath('/asociacion/solicitudes');
  redirect(str(form, 'from') === 'solicitudes' ? '/asociacion/solicitudes' : `/asociacion/animales/${animal.id}#solicitudes`);
}

function newRecordCode(regionSlug: string): string {
  const iso = regionSlug.replace(/[^a-z]/g, '').slice(0, 3).toUpperCase();
  const rand = randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `ADOP-${iso}-${new Date().getFullYear()}-${rand}`;
}

export async function approveAdoptionAction(form: FormData) {
  const { animal, association, request } = await ownRequest(form);
  const path = `/asociacion/animales/${animal.id}`;
  if (animal.status === 'ADOPTED') back(path, 'Este animal ya figura como adoptado');
  if (request.status !== 'PENDING') back(path, 'La solicitud ya no está pendiente');
  const admin = db();
  const { error } = await admin.from('adoptions').insert({
    animal_id: animal.id,
    adopter_id: request.user_id,
    record_code: newRecordCode(association.region_slug),
  });
  if (error) {
    console.error('[adopcion] registrar adopción:', error.message);
    back(path, 'No se pudo registrar la adopción');
  }
  await admin.from('adoption_animals').update({ status: 'ADOPTED' }).eq('id', animal.id);
  await admin.from('adoption_requests').update({ status: 'APPROVED' }).eq('id', request.id);
  await admin.from('adoption_requests').update({ status: 'REJECTED' }).eq('animal_id', animal.id).eq('status', 'PENDING');

  const adopter = await getAdopterProfile(request.user_id);
  if (adopter) {
    const contact = [association.whatsapp && `WhatsApp ${association.whatsapp}`, association.phone && `Tel. ${association.phone}`, association.email]
      .filter(Boolean)
      .join(' · ');
    await sendEmail({
      to: adopter.email,
      subject: `¡${association.name} aprobó tu adopción de ${animal.name}!`,
      html: emailLayout({
        brand: getRegion(association.region_slug).brandName,
        title: `¡Felicitaciones! ${escapeHtml(animal.name)} va a ser parte de tu familia`,
        bodyHtml: `<p>${escapeHtml(association.name)} aprobó tu solicitud. Se van a comunicar con vos para coordinar la entrega.</p><p>Contacto: ${escapeHtml(contact)}</p>`,
      }),
      text: `${association.name} aprobó tu adopción de ${animal.name}. Contacto: ${contact}`,
    });
  }
  revalidatePath('/adopcion');
  revalidatePath('/asociacion/solicitudes');
  redirect(`${path}?ok=adoptado#adopcion`);
}

export async function undoAdoptionAction(form: FormData) {
  const { animal } = await requireOwnAnimal(str(form, 'animal_id'));
  const admin = db();
  const { data: rec } = await admin.from('adoptions').select('adopter_id').eq('animal_id', animal.id).maybeSingle();
  await admin.from('adoptions').delete().eq('animal_id', animal.id);
  await admin.from('adoption_animals').update({ status: 'AVAILABLE' }).eq('id', animal.id);
  if (rec) await admin.from('adoption_requests').update({ status: 'CANCELLED' }).eq('animal_id', animal.id).eq('user_id', rec.adopter_id);
  revalidatePath('/adopcion');
  redirect(`/asociacion/animales/${animal.id}`);
}

export async function updateRegistryAction(form: FormData) {
  const { animal } = await requireOwnAnimal(str(form, 'animal_id'));
  const status = str(form, 'registry_status');
  if (!['PENDING', 'REGISTERED', 'NOT_APPLICABLE'].includes(status)) redirect(`/asociacion/animales/${animal.id}`);
  const number = str(form, 'registry_number').slice(0, 60) || null;
  await db()
    .from('adoptions')
    .update({
      registry_status: status,
      registry_number: status === 'REGISTERED' ? number : null,
      registry_date: status === 'REGISTERED' ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq('animal_id', animal.id);
  revalidatePath('/asociacion/adopciones');
  redirect(str(form, 'from') === 'adopciones' ? '/asociacion/adopciones' : `/asociacion/animales/${animal.id}#adopcion`);
}
