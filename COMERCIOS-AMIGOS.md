# Comercios Amigos

Directorio pago de veterinarias, pet shops, guarderías, peluquerías y refugios, por provincia.
**Publicar y buscar mascotas sigue siendo gratis**: quienes pagan son los comercios.

## Dónde aparecen y qué incluye cada plan

| Lugar | Básico | Destacado |
|---|---|---|
| Directorio `/comercios` (filtro por categoría y orden por cercanía) | ✔ | ✔ primero, con borde naranja y sello "Comercio amigo" |
| Fichas de mascotas perdidas, encontradas y avistamientos: "Veterinarias cerca…" (hasta 3, a 15 km) | ✔ | ✔ primero |
| Pantalla de éxito al publicar una mascota perdida o un avistamiento: "Avisá a las veterinarias cercanas" (hasta 3, a 10 km; el WhatsApp ya lleva el link de la ficha) | ✔ | ✔ primero |
| Pin en el mapa `/mapa` (botón 🏪 Comercios para mostrarlos u ocultarlos) | ✔ pin chico con el ícono de la categoría | ✔ pin grande, con su logo y borde naranja |
| Franja "Comercios amigos de {provincia}" en el inicio | — | ✔ (el orden se mezcla en cada visita) |
| Cartel QR con su logo y la leyenda "Punto amigo" (`/carteles-qr`) | — | ✔ |

- **"Pago hasta":** cuando pasa esa fecha, el comercio **deja de mostrarse solo** en todos lados, sin que tengas que hacer nada. Si se deja vacío, no vence nunca (útil para refugios sin cargo).
- **Lugares vacíos:** si no hay comercios cargados en la zona, los bloques no se muestran.

## Panel de administración: `/admin/comercios`

También se llega desde el botón **"Comercios Amigos"** del panel de moderación.

- **Entrada:** se ingresa con la clave `ADMIN_API_KEY`, que se verifica **en el servidor**.
- **Resumen:** total, activos, destacados, cuántos vencen en 7 días y cuántos están vencidos.
- **Filtros:** por provincia y buscador por nombre, dirección o contacto.
- **Alta y edición:** la ubicación se marca en el mapa y la provincia se completa sola.
  - El logo se sube desde el formulario.
  - Hay campos internos que el público no ve: contacto del dueño y notas de cobro.
- **Acciones rápidas:**
  - **+1 mes:** registra un pago y extiende el vencimiento un mes.
  - **Destacar / Pasar a básico.**
  - **Activar / Desactivar.**
  - **Eliminar:** pide confirmación.

## Puesta en marcha

1. Correr en Supabase la migración `supabase/migrations/20261008000003_partner_businesses.sql`.
   Requiere que antes se hayan corrido las dos de regiones.
2. En Vercel, configurar las variables:

| Variable | Obligatoria | Para qué |
|---|---|---|
| `ADMIN_API_KEY` | Sí | Clave del panel `/admin/comercios`. Mínimo 12 caracteres. **No** usar el prefijo `NEXT_PUBLIC_`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Las altas y bajas usan la service role. La tabla no es accesible con la clave pública. |
| `NEXT_PUBLIC_PARTNER_CONTACT_WHATSAPP` | Recomendada | Número con código de país (ej: `5492804000000`) para el botón "Quiero sumar mi comercio". |
| `NEXT_PUBLIC_PARTNER_CONTACT_EMAIL` | Opcional | Alternativa al WhatsApp. Si no hay ninguna de las dos, el bloque "Sumá tu comercio" no se muestra. |

Las variables `NEXT_PUBLIC_*` se leen al compilar: después de cambiarlas, hay que volver a hacer el deploy.

## Seguridad

- **La tabla `partner_businesses`** no se puede leer ni escribir con la clave pública. RLS está activo, sin políticas públicas, y se revocaron los permisos.
- **El público** solo lee las columnas públicas, a través de la función `get_partner_businesses()`. Nunca ve el contacto del dueño ni las notas.
- **Las rutas `/api/admin/partners`** validan la clave en el servidor (comparación de tiempo constante) y validan los datos con Zod.

## Ideas para vender

- **Empezar por las veterinarias:** su argumento es "las mascotas perdidas terminan en tu veterinaria; aparecé cuando el dueño las busca".
- **Ofrecer un mes gratis** a los primeros 5 a 10 comercios de cada ciudad, para que el directorio no arranque vacío.
- **Plan destacado + carteles QR para la vidriera:** en `/carteles-qr` elegí el comercio y el cartel sale con su logo y "Punto amigo". Llevalo impreso cuando vayas a venderle el plan.
- **Refugios sin cargo:** dejalos activos sin fecha de vencimiento. Suman confianza y contenido.
