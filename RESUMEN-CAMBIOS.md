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
- **Guía completa:** `COMERCIOS-AMIGOS.md`.

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
- **Navegador (Playwright):**
  - Con GPS simulado detecta Jujuy, Santa Fe, CABA y Río Negro.
  - La elección manual se respeta aunque el GPS diga otra cosa.
  - Por IP, desde Córdoba muestra "Mascotas Córdoba".
  - `?region=tierra-del-fuego` cambia la provincia.

## Pendientes y observaciones

- **Correr las tres migraciones antes de publicar.** Si faltan las de regiones, los listados y el mapa quedan vacíos y las publicaciones nuevas fallan.
- **Configurar en Vercel:** `ADMIN_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` (obligatorias), y `NEXT_PUBLIC_PARTNER_CONTACT_WHATSAPP` para el botón "Quiero sumar mi comercio".
- **Revisar coordenadas:** las de las ciudades son aproximadas (±1 km). Conviene revisarlas en las provincias que se lancen primero.
- **Variables opcionales en Vercel:**
  - `NEXT_PUBLIC_SITE_URL`: la URL real del sitio, para los QR.
  - `NEXT_PUBLIC_DEFAULT_REGION`: la provincia por defecto.
- **Rendimiento:** la página de inicio ya no se guarda en caché por 60 segundos, porque depende de la cookie de provincia. Si hiciera falta, se puede pasar a rutas por provincia (`/jujuy/...`).
- **Fronteras:**
  - Carmen de Patagones queda en Río Negro porque está a 2 km de Viedma.
  - Encarnación (Paraguay) queda en Misiones.
- **Seguridad (anterior a estos cambios, URGENTE):**
  - El login de `/admin` es solo visual: usuario y contraseña están escritos en el código del navegador (`emiadmin` / `123456`).
  - Las rutas `/api/reports/delete` y `/api/reports/reunited` no verifican nada, así que cualquiera puede borrar publicaciones.
  - `/api/upload` sube fotos con la clave de administrador sin validar.
  - Solución propuesta: proteger esas rutas con la misma verificación `ADMIN_API_KEY` (`src/lib/admin-auth.ts`) que ya usan los Comercios Amigos.
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
- Comercios Amigos:
  - `src/types/partners.ts`
  - `src/services/partners.service.ts`
  - `src/lib/admin-auth.ts`
  - `src/lib/validations/partner.schema.ts`
  - `src/app/api/admin/partners/*`
  - `src/app/comercios/*`
  - `src/app/admin/comercios/page.tsx`
  - `src/components/partners/*`
  - `COMERCIOS-AMIGOS.md`
- este resumen

**Modificados:**

- `src/middleware.ts`, `src/app/layout.tsx`, `src/app/page.tsx`
- Mapa, carteles QR, admin (panel y login), mis reportes, formularios de publicación y fichas de detalle
- `Navbar`, `Footer`, `ParallaxHero`, `InteractiveTour`
- `InteractiveMap`, `LocationPicker`, `PaginatedPetReportsGrid`, `PetDetailInteractive`, `SightingDetailInteractive`
- `src/services/reports.service.ts`, `src/lib/utils.ts`, `DATABASE.md`

Para más detalle técnico (cómo editar provincias y cómo funciona la detección), ver **`REGIONES.md`**.
