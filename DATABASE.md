# Guía de Base de Datos y PostGIS — Supabase

Este documento detalla la estructura relacional, la configuración geoespacial y cómo ejecutar la migración en tu proyecto de Supabase.

El script completo de migración se encuentra en:  
[`supabase/migrations/20260906000001_initial_schema.sql`](file:///c:/Users/Emi/Desktop/mascota/supabase/migrations/20260906000001_initial_schema.sql)

---

## 1. Cómo aplicar la migración en Supabase

### Opción A: Desde el panel web de Supabase (Más rápida)
1. Ingresá a tu proyecto en [supabase.com](https://supabase.com).
2. En el menú de la izquierda, hacé clic en **SQL Editor**.
3. Creá una nueva consulta (**New Query**).
4. Copiá todo el contenido de [`supabase/migrations/20260906000001_initial_schema.sql`](file:///c:/Users/Emi/Desktop/mascota/supabase/migrations/20260906000001_initial_schema.sql) y pegalo.
5. Hacé clic en **Run** (Ejecutar).

### Opción B: Con Supabase CLI (Local)
Si tenés Supabase CLI configurado:
```bash
supabase db push
# O para ejecutarlo localmente:
supabase db reset
```

---

## 2. Estructura de Tablas y Entidades

| Tabla | Propósito | Columna Geoespacial |
| :--- | :--- | :--- |
| `profiles` | Extensión de `auth.users` con roles, score de confianza y teléfono. | - |
| `pets` | Registro de mascota (especie, raza, colores, tamaño, fotos). | - |
| `lost_reports` | Publicaciones de mascotas perdidas con estado (`ACTIVE`, `REUNITED`, etc.). | `last_seen_location` |
| `found_reports` | Publicaciones de mascotas encontradas/rescatadas. | `found_location` |
| `sightings` | Avistamientos en la vía pública vinculados a una mascota perdida. | `location` |
| `matches` | Parejas de posibles coincidencias generadas por el motor de matching. | - |
| `user_alert_zones` | Preferencias de alertas geográficas comunitarias por radio y especie. | `center_location` |
| `notifications` | Notificaciones in-app para usuarios. | - |
| `reputation_events` | Registro inmutable de puntos por eventos verificados (reunificaciones). | - |
| `moderation_reports` | Denuncias de spam, información falsa o fraude. | - |
| `qr_codes` | Códigos QR físicos para carteles en veterinarias/comercios con tracking. | `approximate_location` |
| `countries`, `provinces`, `cities` | Jerarquía territorial (Semilla: las 24 jurisdicciones de Argentina con sus ciudades principales — ver `20261008000002_all_regions.sql`). | `center_location` |

> **Multi-provincia:** `lost_reports`, `found_reports` y `sightings` tienen la columna `region_slug` (`chubut`, `jujuy`, `cordoba`, `caba`, ...). Ver `REGIONES.md` y las migraciones `20261008000001_multi_region.sql` y `20261008000002_all_regions.sql`.

---

## 3. Funciones RPC PostGIS Disponibles

### A. `get_nearby_lost_reports(p_lat, p_lng, p_radius_meters, p_species, p_limit, p_offset)`
Busca mascotas perdidas activas dentro de un radio en metros, ordenadas de más cercana a más lejana.

**Ejemplo en Next.js / TypeScript**:
```typescript
const { data, error } = await supabase.rpc('get_nearby_lost_reports', {
  p_lat: -43.24895,
  p_lng: -65.30505,
  p_radius_meters: 3000, // 3 km a la redonda
  p_species: 'dog',      // opcional: null para todas
  p_limit: 20,
  p_offset: 0
});
```

### B. `get_nearby_found_reports(p_lat, p_lng, p_radius_meters, p_species, p_limit, p_offset)`
Busca mascotas encontradas activas en la zona.

### C. `get_map_markers(p_min_lat, p_min_lng, p_max_lat, p_max_lng)`
Devuelve los pines unificados para la pantalla del mapa según el área visible en pantalla (bounding box):
- 🔴 Perdidas (`lost`)
- 🟢 Encontradas (`found`)
- 🟡 Avistamientos (`sighting`)

### D. `get_admin_dashboard_stats()` (Super Admin / Moderadores)
Devuelve un JSON con todas las métricas en tiempo real de la plataforma:
- Total y activos de mascotas perdidas y encontradas
- Total de avistamientos registrados
- **Total de mascotas reunidas con sus familias**
- Total de usuarios registrados
- Cantidad de denuncias pendientes de moderación
- Desglose de publicaciones por ciudad (Trelew, Rawson, etc.)
- Actividad de los últimos 7 días

---

## 4. Cómo convertir tu cuenta en Super Admin

Cuando te registres en la app o en Supabase Auth con tu email, ejecutá esto en el **SQL Editor** de Supabase para otorgarte permisos de Administrador:

```sql
-- Reemplazá 'tu_email@ejemplo.com' por tu email de registro
UPDATE profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'tu_email@ejemplo.com');
```

---

## 5. Configuración del Storage de Supabase (Imágenes)

Para almacenar las fotografías de mascotas y avistamientos, creá los siguientes **Buckets públicos** en Supabase Storage:
1. `pet-photos`: Fotos de mascotas perdidas y encontradas (Máx 5MB por foto, formatos: jpg, jpeg, png, webp).
2. `sighting-photos`: Fotos de avistamientos rápidos tomadas por vecinos en la calle.

### Política de Storage recomendada:
- **Lectura**: Pública (`anon` y `authenticated`).
- **Subida**: Permitida a usuarios autenticados (`authenticated`).
