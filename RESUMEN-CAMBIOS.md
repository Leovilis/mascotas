# Resumen de cambios: de "Mascotas Trelew" a todo el país

**Fecha:** 8 de octubre de 2026

## Punto de partida

La app era **Mascotas Trelew**: una red comunitaria para reportar mascotas perdidas, encontradas y avistamientos, con mapa en vivo, carteles QR y panel de moderación. Está hecha con Next.js 16 + Supabase (PostGIS) y se publica en Vercel.

Todo estaba atado a Trelew. El nombre, las coordenadas (-43.24895, -65.30505), los textos y las ciudades estaban escritos a mano en unos 12 archivos.

## Qué se hizo

### 1. Configuración centralizada

Los datos fijos de cada provincia salieron del código y quedaron en un solo lugar:

| Archivo | Contenido |
|---|---|
| `src/config/regions.ts` | Tipos, cookies y funciones comunes. Es liviano porque se carga en todas las páginas. |
| `src/config/regions.generated.ts` | Datos de las 24 jurisdicciones: marca, capital, centro del mapa, ciudades, radios, teléfono de ejemplo, textos de QR y SEO. **Se puede editar a mano.** |
| `src/config/region-boundaries.ts` | Límites de cada provincia: departamentos del IGN unidos y simplificados a ~1 km. |
| `src/config/region-geo.ts` | Detección de la provincia a partir de una coordenada GPS. |

Ningún otro archivo tiene "Trelew" ni coordenadas escritas a mano.

### 2. Las 24 jurisdicciones de Argentina

Se cargaron las 23 provincias y CABA. Chubut mantiene la marca **"Mascotas Trelew"**. El resto se llama **"Mascotas <Provincia>"**, por ejemplo "Mascotas Córdoba" o "Mascotas CABA".

Cada una tiene:

- su capital como centro del mapa;
- hasta 5 ciudades principales;
- su característica telefónica;
- sus propios textos de QR y SEO.

### 3. Detección de la provincia del visitante

Orden de prioridad:

1. **`?region=...` en la URL.** Los carteles QR ya lo incluyen.
2. **Elección manual** en el selector de provincia. Si el usuario elige a mano, nada se la cambia después.
3. **GPS del dispositivo.**
   - Si el usuario ya había dado permiso de ubicación, se detecta solo y aparece el aviso "Detectamos que estás en…".
   - Si no dio permiso, la app no lo pide sola: hay un botón "Detectar mi ubicación".
4. **IP aproximada,** con el header `x-vercel-ip-country-region` que agrega Vercel.
5. **Provincia por defecto:** Chubut.

La provincia elegida se guarda en las cookies `mascotas_region` y `mascotas_region_src`.

Para saber en qué provincia cae una coordenada:

- Si está a menos de 3 km de una ciudad cargada, se asigna la provincia de esa ciudad.
- Si no, se busca el polígono de la provincia que la contiene. CABA se revisa antes que Buenos Aires.
- Si cae apenas afuera de todos los polígonos (por ejemplo sobre la costa), se toma la provincia más cercana a menos de 10 km.

### 4. Los avisos se filtran por provincia

- Las tablas `lost_reports`, `found_reports` y `sightings` tienen una columna nueva, `region_slug`.
- Al publicar, la app guarda la provincia según el punto marcado en el mapa.
- El inicio, el mapa, las estadísticas y la lista de mascotas del formulario de avistamiento muestran solo los avisos de la provincia actual.
- Las fichas de un aviso usan la provincia **de la publicación**, no la de quien la mira.

### 5. Interfaz

- **Selector de provincia:** en compu está en la barra superior; en el celular, dentro del menú. Incluye la opción "Detectar mi ubicación".
- **Textos dinámicos según la provincia:** encabezado, pie de página, inicio, mapa, formularios, fichas, tutorial, carteles QR, panel admin y metadatos para WhatsApp y Google.
- **Mapa:** las opciones de radio son propias de cada provincia e incluyen "Toda la provincia".
- **Carteles QR:** usan `NEXT_PUBLIC_SITE_URL` y agregan `?region=`.

### 6. Base de datos

Hay dos migraciones nuevas, que se corren **en este orden** en el SQL Editor de Supabase:

1. `supabase/migrations/20261008000001_multi_region.sql`
   - Agrega la columna `region_slug` (por defecto `chubut`) y sus índices.
   - Carga Jujuy.
   - Cambia el nombre por defecto de los perfiles nuevos de "Vecino de Trelew" a "Vecino".
2. `supabase/migrations/20261008000002_all_regions.sql`
   - Carga las 24 provincias con `slug` e `iso_code`, y 114 ciudades.
   - Reasigna la provincia de lo ya publicado.

Las dos se pueden correr más de una vez sin problema. Después va la tercera:

3. `supabase/migrations/20261008000003_partner_businesses.sql`: crea los Comercios Amigos.

### 7. Comercios Amigos (monetización)

Es un directorio pago de veterinarias, pet shops, guarderías, peluquerías y refugios por provincia. Publicar mascotas sigue siendo gratis.

- **Página pública `/comercios`:** filtro por categoría, orden por cercanía y botones de contacto.
- **"Veterinarias cerca de donde se perdió"** en las fichas de mascotas y de avistamientos.
- **Planes:**
  - Básico.
  - Destacado: aparece primero y lleva el sello "Comercio amigo".
  - Los dos tienen fecha "Pago hasta" y se ocultan solos al vencer.
- **Panel `/admin/comercios`:** protegido con `ADMIN_API_KEY`, verificada en el servidor.
  - Alta y edición con mapa.
  - Subida de logo.
  - Botón "+1 mes" para registrar un pago.
  - Destacar, activar o desactivar y eliminar.
- **Migración:** `20261008000003_partner_businesses.sql`. La tabla no es accesible al público; el público lee solo las columnas públicas mediante la función `get_partner_businesses()`.
- **Más visibilidad (31/10/2026):**
  - Franja de Destacados en el inicio.
  - Capa de comercios en el mapa: pines grandes con logo para los Destacados y botón para ocultarlos.
  - "Avisá a las veterinarias cercanas" en la pantalla de éxito al publicar.
  - Cartel QR con el logo del comercio ("Punto amigo").
  - Al armar los popups del mapa se escapan los textos que cargan los usuarios (nombres, direcciones), así nadie puede inyectar código.
- **Guía completa:** `COMERCIOS-AMIGOS.md`.

### 8. Refuerzo de seguridad (31/10/2026)

| Problema | Solución |
|---|---|
| Cualquiera podía vaciar toda la base con `delete_all_reports()` usando la clave pública | La función solo la ejecuta el servidor (service role). El panel la llama vía `/api/admin/reports/delete-all`, que exige la clave de admin y la confirmación "BORRAR TODO". |
| `/api/reports/delete` y `/api/reports/reunited` no verificaban nada | Ahora exigen la clave de admin **o** el código de gestión del dueño. `reunited` solo acepta estados válidos (ACTIVE/REUNITED, PENDING/VERIFIED). |
| Login de `/admin` con usuario y contraseña escritos en el código (`emiadmin` / `123456`) | Se entra con `ADMIN_API_KEY`, verificada en el servidor (máximo 10 intentos cada 15 min por IP). `/admin/login` redirige a `/admin`. |
| Next.js 16.3.4 con vulnerabilidad crítica (ejecución remota de código) | Actualizado a 16.4.3. También se actualizaron zod 4.6.7 y sharp 0.35.5. `npm audit --omit=dev`: 0 vulnerabilidades. |
| `/api/upload` aceptaba cualquier archivo y tamaño | Solo JPG, PNG, WEBP o GIF, verificado por el contenido real del archivo. Máximo 5 MB y 20 subidas cada 10 minutos por IP. Ya no se guardan imágenes como texto en la base. |
| Teléfonos y roles de todos los perfiles visibles al público | La tabla `profiles` es privada: cada usuario ve el suyo; moderadores y admins ven todos. |

**Código de gestión para publicaciones anónimas:**

- Al publicar, el navegador genera un código secreto. En la base se guarda solo su huella (hash SHA-256, columna `edit_token_hash`).
- La pantalla de éxito muestra el **código de gestión** (`id.código`). Sirve para administrar la publicación desde otro equipo, en Mis Reportes.
- Con solo el ID se puede ver la publicación, pero no modificarla.
- Las publicaciones creadas antes de este cambio no tienen código: solo el administrador puede marcarlas como reunidas o borrarlas.

**Migración:** `supabase/migrations/20261031000001_security_hardening.sql`.

### 9. Avistamientos confirmados por la familia, aviso contra estafas y denuncias (31/10/2026)

Cualquiera sigue pudiendo reportar un avistamiento sin cuenta, porque es la clave de la app. Pero ahora:

- **Etiqueta de estado** en cada avistamiento, en la ficha de la mascota y en la ficha del avistamiento:
  - **Sin confirmar** (gris): lo cargó un vecino y la familia todavía no lo revisó.
  - **Confirmado por la familia** (verde).
  - **Descartado**: deja de mostrarse en la ficha y en el mapa.
- **Confirmar o descartar es solo para la familia:** en el dispositivo con el código de gestión aparecen los botones "Es mi mascota", "No es / descartar" y "Deshacer". El servidor verifica el código contra la publicación de la mascota perdida a la que está vinculado el avistamiento (`/api/reports/sighting-review`). El administrador también puede hacerlo.
- **Aviso "Cuidado con las estafas"** bien visible:
  - En la ficha de la mascota y en cada avistamiento: no transferir por adelantado, pedir foto actual o videollamada, encontrarse en un lugar público.
  - En el WhatsApp que recibe la familia cuando alguien reporta un avistamiento, con la aclaración de que la red nunca pide dinero.
- **Botón "Denunciar esta publicación"** en fichas y avistamientos, sin cuenta. Motivos: pide dinero/estafa, información falsa, spam, inapropiado, duplicada u otro. Máximo 5 denuncias cada 10 minutos por IP.
- **Bandeja real de denuncias en `/admin`:** reemplaza el ejemplo fijo ("Publicación #394"). Cada denuncia tiene link a la publicación y dos acciones:
  - **Ocultar publicación:** una perdida o encontrada pasa a `REMOVED` y desaparece del sitio; un avistamiento pasa a `DISMISSED`.
  - **Desestimar.**
- **Panel admin:** "Publicaciones por ciudad" muestra solo las ciudades con publicaciones (las 15 con más) y se quitó el texto fijo "emiadmin".

No requiere migración nueva: usa el estado `DISMISSED` y la tabla `moderation_reports`, que ya existían.

### 10. Email de contacto, recuperación del código y validación de teléfonos (31/10/2026)

- **Email opcional al publicar una mascota perdida:** con la aclaración "no se publica". Se usa para:
  - **Mandar el código de gestión por mail** apenas se publica. La pantalla de éxito confirma "También te lo enviamos a …".
  - **Avisar por mail a la familia** cuando alguien reporta un avistamiento de su mascota: una sola vez por avistamiento y solo si es reciente.
  - **Recuperar el código:** en Mis Reportes, "¿Perdiste tu código? Recuperalo con tu email". Se generan **códigos nuevos** (los anteriores dejan de funcionar) y se envían por mail. La respuesta es siempre la misma, para no revelar qué emails están registrados. Máximo 3 pedidos cada 15 minutos por IP.
- **Privacidad:** el email se guarda en la tabla aparte `report_contacts`, que no se puede leer ni escribir con la clave pública. Solo se registra si quien lo pide tiene el código de gestión de la publicación.
- **Envío con Resend:** variables `RESEND_API_KEY` y `EMAIL_FROM`. Si no están configuradas, la app funciona igual y solo no se envían los mails. Todos los mails incluyen el aviso contra estafas.
- **Teléfonos:** en los formularios no se pueden escribir letras (solo números, `+`, espacios, guiones y paréntesis), y se exige que tengan entre 8 y 15 dígitos. Se valida en el navegador y en el servidor, en publicar, avistamientos y comercios.
- **Email:** se valida el formato al salir del campo y otra vez en el servidor.
- **Migración:** `supabase/migrations/20261031000002_report_contacts.sql`.

### 11. Captcha anti-bots y límite de publicaciones (31/10/2026)

- **Captcha de Cloudflare Turnstile** (modo "Managed", casi siempre invisible) en: publicar mascota perdida, reportar avistamiento, denunciar y recuperar el código. Si la verificación todavía no terminó, el formulario avisa en vez de enviar.
- **Las publicaciones se crean en el servidor** (`/api/reports/create`), no más desde el navegador. El servidor:
  - verifica el captcha con la clave secreta;
  - vuelve a validar todos los datos;
  - solo acepta fotos subidas al Storage del proyecto;
  - calcula la provincia por coordenadas;
  - genera el código de gestión (en la base queda solo el hash).
- **Límite por persona (IP), guardado en la base** para que funcione aunque Vercel use varias instancias:
  - mascotas perdidas o encontradas: 5 por hora;
  - avistamientos: 15 por hora;
  - denuncias: 10 por hora (además de 5 cada 10 minutos);
  - recuperar código: 5 por hora (además de 3 cada 15 minutos).
  La IP se guarda hasheada en `rate_limit_events` y los registros de más de 2 días se borran solos.
- **Se cerró el acceso directo a la base:** el público ya no puede insertar en `pets`, `lost_reports`, `found_reports` ni `sightings` con la clave pública (si pudiera, un bot se salteaba el captcha).
- **Agujero grave corregido:** una migración vieja (`20260910000001_delete_all_reports_rpc.sql`) había dejado políticas "Public Delete …" que permitían a **cualquiera borrar** publicaciones, mascotas, denuncias, notificaciones y QR directo contra Supabase, sin pasar por la app. Se eliminaron.
- **Variables:** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (pública) y `TURNSTILE_SECRET_KEY` (solo servidor). Sin la secreta, el captcha no se exige (sirve para desarrollo).
- **Migración:** `supabase/migrations/20261031000003_server_side_inserts.sql`. **Después de correrla, publicar necesita `SUPABASE_SERVICE_ROLE_KEY`** en `.env` y en Vercel.

### 12. Adopción responsable (1/11/2026)

Se integró la app "Adoptá Jujuy" (carpeta `adopta`) dentro de Mascotas Argentinas, para todo el país. Detalle completo en **`ADOPCION.md`**.

- **Público:** sección `/adopcion` filtrada por provincia, ficha de cada animal, página de cada refugio y franja "Buscan familia en …" en la home. Link "Adopción" en la barra y en el menú.
- **Adoptantes:** cuenta con Supabase Auth (email y contraseña, confirmación por mail y recuperación de contraseña) y ficha privada con nombre, DNI, teléfono y domicilio. Piden adoptar con un mensaje y siguen el estado en `/cuenta`.
- **Asociaciones:** se registran y quedan **pendientes hasta que el admin las aprueba** en `/admin/asociaciones`. En su panel `/asociacion`:
  - cargan animales con hasta 6 fotos;
  - registran vacunas y controles;
  - marcan animales como reservados;
  - ven las solicitudes con los datos del adoptante;
  - aprueban la adopción y generan la ficha imprimible;
  - anotan la inscripción en el registro oficial.
- **Mails:** asociación nueva, asociación aprobada o rechazada, solicitud nueva y adopción aprobada.
- **Seguridad:** todas las tablas tienen RLS y están bloqueadas para la clave pública; cada acción verifica en el servidor que el animal sea de la asociación del usuario. No se puede repetir un DNI. Un adoptante puede tener hasta 5 solicitudes en revisión a la vez.
- **Migración:** `supabase/migrations/20261101000001_adoption.sql`.

### 13. "Volvieron a casa": reencuentros de los últimos 3 meses (3/11/2026)

- **Página `/reencuentros`:** muestra las mascotas de la provincia que volvieron con su familia en los últimos 90 días, perdidas que volvieron a casa y encontradas que se devolvieron. Cada tarjeta dice la fecha y cuántos días tardó. Arriba hay un resumen con la cantidad total y el promedio de días.
- **Home:** franja "Volvieron a casa en …" con los últimos 4. Solo aparece si hay alguno.
- **Mapa:** el contador "N mascotas encontradas y devueltas a casa" ahora es un link a `/reencuentros`.
- **Menú:** nuevo acceso "Volvieron a casa".
- **Fecha del reencuentro:** columna nueva `reunited_at`. Se completa al marcar la mascota como reunida y se borra si la búsqueda se reactiva. A las que ya estaban reunidas se les puso como fecha su última modificación.
- No se muestran datos de contacto.
- **Migración:** `supabase/migrations/20261103000001_reunited_at.sql`.

## Pruebas realizadas

- **TypeScript:** sin errores (`tsc --noEmit`).
- **`next build`:** compila bien.
- **ESLint:** no aparecieron errores nuevos. Bajó de 175 a 174 problemas; los que quedan ya estaban antes.
- **Migraciones:** se ejecutaron sobre un Postgres 16 + PostGIS con el esquema completo del proyecto, dos veces cada una.
- **Detección por coordenadas:**
  - Las 114 ciudades cargadas quedan en su provincia.
  - Palermo queda en CABA; Avellaneda y Vicente López en Buenos Aires; Rosario en Santa Fe; Bariloche en Río Negro.
  - Montevideo y Santiago de Chile quedan como "fuera de Argentina".
- **Comercios Amigos:**
  - La función SQL se probó en Postgres: ordena destacados primero y luego por distancia, oculta los vencidos y el rol anon no puede leer la tabla.
  - La API responde 401 con una clave incorrecta, 400 con datos inválidos y 400 con un ID inválido.
  - Las pantallas `/comercios` y `/admin/comercios` se probaron en el navegador con datos de ejemplo.
- **Seguridad:** se probó contra una réplica local de Supabase (Postgres 16 + PostGIS + PostgREST, con los roles anon/authenticated/service_role y las ocho migraciones):
  - Con la clave pública: `delete_all_reports` da "permission denied", `profiles` devuelve vacío y el UPDATE directo de un aviso no modifica nada.
  - Marcar como reunido o borrar un aviso sin código o con un código falso da 403; un estado inventado da 400.
  - El dueño con su código puede marcarlo como reunido y borrarlo; el admin, con su clave, puede reactivarlo.
  - Borrar todo exige clave y confirmación.
  - `/api/upload` rechaza un .txt disfrazado de imagen y un archivo de 6 MB, y acepta un PNG válido.
  - Flujo completo en el navegador: publicar → código de gestión → en otro navegador, con solo el ID no puede marcarla como reunida y con el código completo sí → login de admin con clave mala rechazado y con la correcta entra.
- **Avistamientos y denuncias:**
  - Sin código, o con el código de otra publicación, no se puede confirmar ni descartar un avistamiento (403). La familia con su código sí. Una decisión inválida da 400.
  - La denuncia se guarda; un motivo inválido da 400; con la clave pública no se pueden leer las denuncias.
  - El admin las lista y, al ocultar, el avistamiento pasa a `DISMISSED` y deja de aparecer en la lista pública.
  - En el navegador: un visitante ve "Sin confirmar" y el aviso de estafas, pero no los botones de la familia, y puede denunciar. La familia confirma y ve "Confirmado por la familia". El admin ve la denuncia real en la bandeja.
- **Emails** (con un servidor que simula Resend):
  - Al publicar con email llega el mail con el código; al reportar un avistamiento, el aviso a la familia. Repetir el aviso del mismo avistamiento no reenvía.
  - El email no aparece en los datos públicos del aviso y `report_contacts` está bloqueada para la clave pública. Registrar un email sin código da error.
  - Recuperación: el código viejo deja de funcionar y el nuevo del mail sí funciona. El cuarto pedido seguido queda bloqueado.
  - Al escribir "388abc 41x2-3456" en el teléfono queda "388 412-3456". "leo@mal" muestra error de formato.
- **Captcha y límites** (con un servidor que simula la verificación de Cloudflare):
  - Publicar sin token, con un token rechazado o con una foto de otro sitio da error; con token válido se crea, con la provincia correcta y el hash del código.
  - La sexta publicación de una misma IP en una hora da 429.
  - Denunciar y recuperar código sin token dan error; con token funcionan.
  - El código que genera el servidor sirve para borrar la publicación.
  - Con la clave pública, insertar en `pets` o borrar `lost_reports` da "permission denied".
  - En el navegador: el widget aparece, el avistamiento se registra enviando el token y queda guardado el código en el dispositivo; la denuncia con captcha llega.
- **Adopción** (flujo completo en el navegador, con un Supabase Auth simulado):
  - Una persona crea su cuenta, registra la asociación (queda pendiente), carga un animal con foto y una vacuna.
  - Mientras está pendiente, la ficha pública da 404.
  - El admin aprueba la asociación; una clave incorrecta da 401. Después de aprobarla, el animal aparece en `/adopcion` y en la home.
  - Otra persona crea su cuenta desde la ficha y manda la solicitud. Un DNI repetido se rechaza, aunque se escriba con puntos.
  - El adoptante no puede entrar al panel de la asociación ni a la ficha interna del animal.
  - La asociación ve la solicitud con DNI y mensaje, aprueba la adopción, carga el N° de registro e imprime la ficha.
  - El adoptante ve "¡Aprobada!" y el animal deja de listarse como disponible.
  - Login con contraseña incorrecta: rechazado. Login correcto y cierre de sesión: funcionan.
  - Llegaron los 4 mails.
  - Con la clave pública, las tablas de adopción dan "permission denied".
- **Navegador (Playwright):**
  - Con GPS simulado detecta Jujuy, Santa Fe, CABA y Río Negro.
  - La elección manual se respeta aunque el GPS diga otra cosa.
  - Por IP, desde Córdoba muestra "Mascotas Córdoba".
  - `?region=tierra-del-fuego` cambia la provincia.

## Pendientes y observaciones

- **Correr las migraciones antes de publicar, en orden** (`20261008000001`, `…02`, `…03`, `20261031000001`, `20261031000002`, `20261031000003`, `20261101000001` y `20261103000001`). Si falta la de seguridad, publicar falla, porque la app ya envía la columna `edit_token_hash`.
- **Emails (Resend):** crear la cuenta, verificar un dominio propio en *Domains* y cargar `RESEND_API_KEY` y `EMAIL_FROM` en `.env` y en Vercel. Sin dominio, Resend solo deja mandarte mails a vos mismo, desde `onboarding@resend.dev`.
- **Instalar las dependencias actualizadas:** `npm install` (Next 16.4.3).
- **Configurar en Vercel:** `ADMIN_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` (obligatorias; sin `ADMIN_API_KEY` nadie puede entrar a `/admin`), y `NEXT_PUBLIC_PARTNER_CONTACT_WHATSAPP` para el botón "Quiero sumar mi comercio". Hay una plantilla en `.env.example`.
- **Revisar coordenadas:** las de las ciudades son aproximadas (±1 km). Conviene revisarlas en las provincias que se lancen primero.
- **Variables opcionales en Vercel:**
  - `NEXT_PUBLIC_SITE_URL`: la URL real del sitio, para los QR.
  - `NEXT_PUBLIC_DEFAULT_REGION`: la provincia por defecto.
- **Rendimiento:** la página de inicio ya no se guarda en caché por 60 segundos, porque depende de la cookie de provincia. Si hiciera falta, se puede pasar a rutas por provincia (`/jujuy/...`).
- **Fronteras:**
  - Carmen de Patagones queda en Río Negro porque está a 2 km de Viedma.
  - Encarnación (Paraguay) queda en Misiones.
- **Seguridad: lo que todavía falta:**
  - Turnstile: cargar `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` también en Vercel, y agregar el dominio real del sitio en el widget de Cloudflare (*Hostname Management*).
  - El administrador usa una única clave compartida. Si va a haber varios moderadores, conviene pasar a cuentas con Supabase Auth y el rol de `profiles`.
- **Next.js 16:** avisa que `middleware.ts` está deprecado y pasa a llamarse `proxy.ts`. Por ahora sigue funcionando.

## Archivos

**Nuevos:**

- `src/config/regions.ts`
- `src/config/regions.generated.ts`
- `src/config/region-boundaries.ts`
- `src/config/region-geo.ts`
- `src/lib/region/server.ts`
- `src/components/region/RegionProvider.tsx`
- `src/components/region/RegionSelector.tsx`
- las dos migraciones
- `REGIONES.md` (guía técnica)
- Seguridad:
  - `src/lib/report-auth.ts`
  - `src/lib/edit-token.ts`
  - `src/lib/admin-key-storage.ts`
  - `src/app/api/admin/verify/route.ts`
  - `src/app/api/admin/reports/delete-all/route.ts`
  - `supabase/migrations/20261031000001_security_hardening.sql`
  - `.env.example`
- Captcha y límites:
  - `src/lib/turnstile.ts`, `src/lib/db-rate-limit.ts`
  - `src/components/forms/TurnstileWidget.tsx`
  - `src/app/api/reports/create/route.ts`
  - `supabase/migrations/20261031000003_server_side_inserts.sql`
- Comercios Amigos:
  - `src/types/partners.ts`
  - `src/services/partners.service.ts`
  - `src/lib/admin-auth.ts`
  - `src/lib/validations/partner.schema.ts`
  - `src/app/api/admin/partners/*`
  - `src/app/comercios/*`
  - `src/app/admin/comercios/page.tsx`
  - `src/components/partners/*` (incluye `FeaturedPartnersStrip.tsx`)
  - `COMERCIOS-AMIGOS.md`
- este resumen

**Modificados:**

- `src/middleware.ts`, `src/app/layout.tsx`, `src/app/page.tsx`
- Mapa, carteles QR, admin (panel y login), mis reportes, formularios de publicación y fichas de detalle
- `Navbar`, `Footer`, `ParallaxHero`, `InteractiveTour`
- `InteractiveMap`, `LocationPicker`, `PaginatedPetReportsGrid`, `PetDetailInteractive`, `SightingDetailInteractive`
- `src/services/reports.service.ts`, `src/lib/utils.ts`, `DATABASE.md`

Para más detalle técnico (cómo editar provincias y cómo funciona la detección), ver **`REGIONES.md`**.
