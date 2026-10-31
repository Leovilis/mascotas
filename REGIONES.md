# Multi-provincia (regiones)

La app sirve a las **24 jurisdicciones de Argentina** (23 provincias + CABA) desde un solo código y una sola base de datos.
Chubut conserva la marca "Mascotas Trelew"; el resto usa "Mascotas <Provincia>" (ej: Mascotas Córdoba, Mascotas CABA).

## Dónde se configura

| Archivo | Qué tiene |
|---|---|
| `src/config/regions.generated.ts` | Datos de las 24 provincias: marca, capital, centro del mapa, 5 ciudades principales, radios del mapa, teléfono de ejemplo, textos de QR y SEO. **Editable a mano.** |
| `src/config/regions.ts` | Tipos, cookies y funciones comunes (liviano, se usa en todas las páginas). |
| `src/config/region-boundaries.ts` | Límites de cada provincia (departamentos del IGN unidos y simplificados a ~1 km). Generado, no editar. |
| `src/config/region-geo.ts` | Detección de provincia por coordenadas GPS. |

Ningún otro archivo tiene coordenadas ni nombres de ciudad escritos a mano.

### Cómo se detecta la provincia de una coordenada

1. Si está a menos de 3 km de una ciudad cargada, gana esa ciudad (corrige bordes en ríos, ej: Viedma).
2. Si cae dentro del polígono de una provincia (CABA se revisa antes que Buenos Aires).
3. Si cae apenas afuera de todas (costa), la provincia más cercana a menos de 10 km.
4. Si no, se considera fuera de Argentina.

Se probó con las 114 ciudades cargadas (todas bien clasificadas) y casos de borde: Palermo → CABA, Avellaneda y Vicente López → Buenos Aires,
Rosario → Santa Fe, Bariloche → Río Negro, Montevideo y Santiago de Chile → fuera. Ciudades pegadas a la frontera como Encarnación (Paraguay)
pueden quedar asignadas a la provincia vecina (Misiones); no afecta a usuarios argentinos.

## Cómo se decide qué provincia ve cada visitante

| Prioridad | Mecanismo | Dónde |
|---|---|---|
| 1 | `?region=jujuy` en la URL (los QR impresos lo incluyen) | `src/middleware.ts` |
| 2 | Elección manual en el selector de provincia | `RegionSelector` → cookie `mascotas_region` |
| 3 | GPS del dispositivo (si el usuario ya dio permiso de ubicación, se detecta solo; si no, con "Detectar mi ubicación") | `RegionProvider` |
| 4 | IP aproximada (header `x-vercel-ip-country-region` que agrega Vercel) | `src/middleware.ts` |
| 5 | Provincia por defecto (`NEXT_PUBLIC_DEFAULT_REGION`, si no `chubut`) | `src/config/regions.ts` |

Si el usuario elige una provincia a mano, el GPS ya no la cambia.
Las fichas de una publicación (perdida, encontrada, avistamiento) usan la provincia **de la publicación** según sus coordenadas, no la del visitante.

## Base de datos

Las publicaciones (`lost_reports`, `found_reports`, `sightings`) tienen la columna `region_slug`.
La app la completa al publicar (según las coordenadas del punto marcado en el mapa) y filtra los listados y el mapa por esa columna.

**Antes de publicar esta versión** corré en el SQL Editor de Supabase, en este orden:
1. `supabase/migrations/20261008000001_multi_region.sql` (agrega la columna `region_slug`).
2. `supabase/migrations/20261008000002_all_regions.sql` (carga las 24 provincias y 114 ciudades y reasigna la provincia de lo ya publicado).

Las dos son seguras de correr más de una vez.

## Variables de entorno nuevas (opcionales)

| Variable | Para qué | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_DEFAULT_REGION` | Provincia cuando no se puede detectar | `chubut` |
| `NEXT_PUBLIC_SITE_URL` | URL pública usada en QR y links | `https://mascotastrelew.vercel.app` |

## Cambiar datos de una provincia

Editá su bloque en `src/config/regions.generated.ts` (ej: cambiar la ciudad principal, el nombre de la marca o sumar ciudades).
Si sumás ciudades y querés que estén también en la tabla `cities`, agregalas en una migración nueva.

## Nota de rendimiento

Antes la home se cacheaba 60 segundos (ISR). Ahora las páginas leen la cookie de provincia, así que se generan
por cada visita. Para el tráfico de una red comunitaria el impacto es bajo; si algún día hace falta,
se puede pasar a rutas por provincia (`/jujuy/...`) para volver a cachear.
