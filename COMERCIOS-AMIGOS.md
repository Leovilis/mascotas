# Comercios Amigos

Directorio pago de veterinarias, pet shops, guarderías, peluquerías y refugios, por provincia.
**Publicar y buscar mascotas sigue siendo gratis**: quienes pagan son los comercios.

## Qué ve el público

| Dónde | Qué aparece |
|---|---|
| `/comercios` | Directorio de la provincia actual, con filtro por categoría y "Ordenar por cercanía" (GPS). Botones de WhatsApp, Llamar, Cómo llegar, Instagram y Web. |
| Ficha de mascota perdida/encontrada | "Veterinarias cerca de donde se perdió / del hallazgo": hasta 3 veterinarias a menos de 15 km. El WhatsApp ya lleva un mensaje con el link de la ficha. |
| Ficha de avistamiento | "Veterinarias cerca del avistamiento" (lectura de microchip). |
| Menú y pie de página | Link a "Comercios Amigos". |

Si no hay comercios cargados en la zona, los bloques no se muestran (no quedan huecos vacíos).

## Planes

| Plan | Qué incluye |
|---|---|
| **Básico** | Aparece en el directorio y en las fichas cercanas. |
| **Destacado** | Primero en todas las listas (antes que los más cercanos), con borde naranja y sello "Comercio amigo". |

Cada comercio tiene **"Pago hasta"**. Cuando pasa esa fecha **deja de mostrarse solo**, sin que tengas que hacer nada.
Si se deja vacío, no vence nunca (útil para refugios sin cargo).

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
- **Plan destacado + carteles QR para la vidriera:** generá el QR desde `/carteles-qr` con el nombre del comercio como lugar.
- **Refugios sin cargo:** dejalos activos sin fecha de vencimiento. Suman confianza y contenido.
