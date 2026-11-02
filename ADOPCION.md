# Adopción responsable

La app "Adoptá Jujuy" quedó integrada dentro de Mascotas Argentinas. Funciona en las 24 provincias, usa la misma base de Supabase y el mismo sitio.

## Cómo funciona

| Quién | Qué hace | Dónde |
|---|---|---|
| Visitante | Ve los animales en adopción de su provincia y los refugios | `/adopcion`, `/adopcion/[id]`, `/adopcion/asociaciones/[slug]` |
| Adoptante | Crea su cuenta con sus datos (nombre, DNI, teléfono, domicilio), pide adoptar y sigue sus solicitudes | `/cuenta/registro`, `/cuenta` |
| Asociación / refugio | Se registra (queda **pendiente**), carga animales con fotos, vacunas y controles, revisa solicitudes, aprueba adopciones, imprime la ficha y anota la inscripción en el registro oficial | `/adopcion/sumar-asociacion`, `/asociacion/*` |
| Administrador del sitio | Aprueba, rechaza o suspende asociaciones | `/admin/asociaciones` (botón en `/admin`) |

- Solo las asociaciones **aprobadas** se ven al público. Mientras están pendientes pueden ir cargando animales.
- La home muestra "Buscan familia en …" con los últimos animales de la provincia (si hay).
- Mails automáticos (con Resend): asociación nueva → al admin; aprobada/rechazada → a la asociación; nueva solicitud → a la asociación; adopción aprobada → al adoptante.

## Privacidad

- El DNI, domicilio y teléfono del adoptante **no se publican**. Los ve solo la asociación a la que le pidió adoptar, y el admin en el caso de la persona responsable de una asociación.
- Todas las tablas de adopción tienen RLS sin acceso para la clave pública: la app lee y escribe solo desde el servidor.

## Puesta en marcha

1. **Migración:** correr `supabase/migrations/20261101000001_adoption.sql` en el SQL Editor.
2. **Supabase → Authentication → URL Configuration:**
   - *Site URL:* `https://mascotasargentinas.vercel.app`
   - *Redirect URLs:* agregar `https://mascotasargentinas.vercel.app/auth/callback` y, para desarrollo, `http://localhost:3000/auth/callback`.
3. **Supabase → Authentication → Emails → SMTP Settings** (recomendado): activar *custom SMTP* con Resend, porque el correo que trae Supabase por defecto permite muy pocos mails por hora.
   - Host `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña: una API key de Resend.
   - Remitente: `no-responder@avisos.mikiosko.com.ar`.
   - Opcional: traducir al español las plantillas *Confirm signup* y *Reset password*.
4. **Variable opcional:** `ADMIN_NOTIFY_EMAIL`, el mail donde te llega el aviso de cada asociación nueva.

## Diferencias con la app original "adopta"

- Next 14 + Prisma + SQLite + NextAuth → Next 16 + Supabase (Postgres) + Supabase Auth.
- Las fotos van a Supabase Storage (antes a `public/uploads`, que no funciona en Vercel).
- Multi-provincia, con aprobación de asociaciones, estado "Reservado", solicitudes con mensaje y estados (en revisión / aprobada / no aprobada / cancelada), mails y ficha imprimible.
- El código de ficha es `ADOP-<PROV>-<AÑO>-<código>` (antes `JUJ-…` aleatorio de 4 dígitos, que podía repetirse).
- Los datos de prueba de la app vieja no se migraron (era SQLite local).
