-- ==============================================================================
-- MIGRACIÓN: 20261008000002_all_regions.sql
-- LAS 24 JURISDICCIONES DE ARGENTINA (23 provincias + CABA)
--
-- Requiere haber corrido antes 20261008000001_multi_region.sql (columna region_slug).
-- 1. Carga todas las provincias (con slug y código ISO) y sus ciudades principales.
-- 2. Recalcula region_slug de las publicaciones existentes por la ciudad cargada más cercana.
-- Es seguro correrla más de una vez. Los slugs coinciden con src/config/regions.generated.ts.
-- ==============================================================================

-- 1. PROVINCIAS ------------------------------------------------------------------
ALTER TABLE provinces ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE provinces ADD COLUMN IF NOT EXISTS iso_code TEXT;

-- Las provincias ya existentes (Chubut id 1, Jujuy id 2) conservan su id
UPDATE provinces SET slug = 'chubut' WHERE id = 1 AND slug IS NULL;

INSERT INTO provinces (country_id, name, slug, iso_code)
SELECT 'ARG', v.name, v.slug, v.iso
FROM (VALUES
    ('buenos-aires', 'Buenos Aires', 'B'),
    ('caba', 'Ciudad de Buenos Aires', 'C'),
    ('catamarca', 'Catamarca', 'K'),
    ('chaco', 'Chaco', 'H'),
    ('chubut', 'Chubut', 'U'),
    ('cordoba', 'Córdoba', 'X'),
    ('corrientes', 'Corrientes', 'W'),
    ('entre-rios', 'Entre Ríos', 'E'),
    ('formosa', 'Formosa', 'P'),
    ('jujuy', 'Jujuy', 'Y'),
    ('la-pampa', 'La Pampa', 'L'),
    ('la-rioja', 'La Rioja', 'F'),
    ('mendoza', 'Mendoza', 'M'),
    ('misiones', 'Misiones', 'N'),
    ('neuquen', 'Neuquén', 'Q'),
    ('rio-negro', 'Río Negro', 'R'),
    ('salta', 'Salta', 'A'),
    ('san-juan', 'San Juan', 'J'),
    ('san-luis', 'San Luis', 'D'),
    ('santa-cruz', 'Santa Cruz', 'Z'),
    ('santa-fe', 'Santa Fe', 'S'),
    ('santiago-del-estero', 'Santiago del Estero', 'G'),
    ('tierra-del-fuego', 'Tierra del Fuego', 'V'),
    ('tucuman', 'Tucumán', 'T')
) AS v(slug, name, iso)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, iso_code = EXCLUDED.iso_code;

-- Mantener la secuencia del SERIAL por delante (por si hubo ids insertados a mano)
SELECT setval(pg_get_serial_sequence('provinces', 'id'), GREATEST((SELECT MAX(id) FROM provinces), 1));

-- 2. CIUDADES (coordenadas aproximadas) ---------------------------------------------
INSERT INTO cities (province_id, name, center_location, default_radius_km)
SELECT p.id, c.name, ST_SetSRID(ST_MakePoint(c.lng, c.lat), 4326)::geography, c.radius
FROM (VALUES
    ('buenos-aires', 'La Plata', -34.9214, -57.9545, 15),
    ('buenos-aires', 'Mar del Plata', -38.0055, -57.5426, 20),
    ('buenos-aires', 'Bahía Blanca', -38.7196, -62.2724, 15),
    ('buenos-aires', 'Tandil', -37.3217, -59.1332, 10),
    ('buenos-aires', 'San Nicolás de los Arroyos', -33.33, -60.24, 10),
    ('caba', 'Ciudad de Buenos Aires', -34.6037, -58.3816, 15),
    ('catamarca', 'San Fernando del Valle de Catamarca', -28.4696, -65.7795, 12),
    ('catamarca', 'Valle Viejo', -28.49, -65.735, 8),
    ('catamarca', 'Andalgalá', -27.5819, -66.3165, 8),
    ('catamarca', 'Belén', -27.6496, -67.0333, 8),
    ('catamarca', 'Tinogasta', -28.0666, -67.5666, 8),
    ('chaco', 'Resistencia', -27.4606, -58.9839, 15),
    ('chaco', 'Presidencia Roque Sáenz Peña', -26.7852, -60.4388, 10),
    ('chaco', 'Barranqueras', -27.4833, -58.9333, 8),
    ('chaco', 'Villa Ángela', -27.5833, -60.7167, 8),
    ('chaco', 'Charata', -27.2163, -61.2, 8),
    ('chubut', 'Trelew', -43.24895, -65.30505, 15),
    ('chubut', 'Rawson', -43.30016, -65.10228, 12),
    ('chubut', 'Playa Unión', -43.31667, -65.04167, 10),
    ('chubut', 'Puerto Madryn', -42.7692, -65.03851, 20),
    ('chubut', 'Gaiman', -43.28974, -65.49298, 10),
    ('cordoba', 'Córdoba', -31.4201, -64.1888, 15),
    ('cordoba', 'Río Cuarto', -33.13, -64.35, 12),
    ('cordoba', 'Villa María', -32.41, -63.26, 10),
    ('cordoba', 'Villa Carlos Paz', -31.42, -64.5, 10),
    ('cordoba', 'San Francisco', -31.43, -62.09, 10),
    ('corrientes', 'Corrientes', -27.4692, -58.8306, 15),
    ('corrientes', 'Goya', -29.14, -59.27, 10),
    ('corrientes', 'Paso de los Libres', -29.7128, -57.0877, 8),
    ('corrientes', 'Mercedes', -29.1796, -58.08, 8),
    ('corrientes', 'Curuzú Cuatiá', -29.7917, -58.0546, 8),
    ('entre-rios', 'Paraná', -31.7333, -60.5333, 15),
    ('entre-rios', 'Concordia', -31.3896, -58.03, 12),
    ('entre-rios', 'Gualeguaychú', -33.01, -58.5172, 10),
    ('entre-rios', 'Concepción del Uruguay', -32.48, -58.24, 10),
    ('entre-rios', 'Victoria', -32.61, -60.18, 8),
    ('formosa', 'Formosa', -26.1775, -58.1781, 15),
    ('formosa', 'Clorinda', -25.2848, -57.7185, 10),
    ('formosa', 'Pirané', -25.7324, -59.1088, 8),
    ('formosa', 'El Colorado', -26.3081, -59.3729, 8),
    ('formosa', 'Las Lomitas', -24.6996, -60.6, 8),
    ('jujuy', 'San Salvador de Jujuy', -24.1858, -65.2995, 15),
    ('jujuy', 'Palpalá', -24.2565, -65.2116, 10),
    ('jujuy', 'Perico', -24.382, -65.113, 10),
    ('jujuy', 'San Pedro de Jujuy', -24.231, -64.866, 10),
    ('jujuy', 'Libertador Gral. San Martín', -23.8064, -64.7876, 10),
    ('la-pampa', 'Santa Rosa', -36.6167, -64.2833, 12),
    ('la-pampa', 'General Pico', -35.6596, -63.757, 10),
    ('la-pampa', 'Toay', -36.6736, -64.3792, 8),
    ('la-pampa', 'Realicó', -35.0368, -64.2447, 8),
    ('la-pampa', 'General Acha', -37.377, -64.6043, 8),
    ('la-rioja', 'La Rioja', -29.4131, -66.8558, 12),
    ('la-rioja', 'Chilecito', -29.1655, -67.5, 10),
    ('la-rioja', 'Aimogasta', -28.56, -66.8065, 8),
    ('la-rioja', 'Chamical', -30.3496, -66.3167, 8),
    ('la-rioja', 'Chepes', -31.35, -66.6, 8),
    ('mendoza', 'Mendoza', -32.8895, -68.8458, 15),
    ('mendoza', 'San Rafael', -34.6177, -68.3301, 12),
    ('mendoza', 'Godoy Cruz', -32.9254, -68.8456, 8),
    ('mendoza', 'Luján de Cuyo', -33.0362, -68.8796, 10),
    ('mendoza', 'San Martín', -33.081, -68.4681, 10),
    ('misiones', 'Posadas', -27.3671, -55.8961, 15),
    ('misiones', 'Oberá', -27.4871, -55.1199, 10),
    ('misiones', 'Eldorado', -26.4, -54.6333, 10),
    ('misiones', 'Puerto Iguazú', -25.5991, -54.5736, 10),
    ('misiones', 'Apóstoles', -27.9147, -55.7536, 8),
    ('neuquen', 'Neuquén', -38.9516, -68.0591, 15),
    ('neuquen', 'Cutral Có', -38.9333, -69.2333, 10),
    ('neuquen', 'Plottier', -38.9667, -68.2333, 8),
    ('neuquen', 'Zapala', -38.9, -70.0667, 8),
    ('neuquen', 'San Martín de los Andes', -40.1572, -71.3533, 10),
    ('rio-negro', 'Viedma', -40.8135, -62.9967, 12),
    ('rio-negro', 'San Carlos de Bariloche', -41.1335, -71.3103, 15),
    ('rio-negro', 'General Roca', -39.0333, -67.5833, 10),
    ('rio-negro', 'Cipolletti', -38.9339, -67.9903, 10),
    ('rio-negro', 'Villa Regina', -39.1, -67.0833, 8),
    ('salta', 'Salta', -24.7821, -65.4232, 15),
    ('salta', 'San Ramón de la Nueva Orán', -23.1322, -64.3266, 10),
    ('salta', 'Tartagal', -22.5164, -63.8013, 10),
    ('salta', 'General Güemes', -24.6667, -65.05, 8),
    ('salta', 'Cafayate', -26.073, -65.9761, 8),
    ('san-juan', 'San Juan', -31.5375, -68.5364, 15),
    ('san-juan', 'Rawson', -31.565, -68.525, 8),
    ('san-juan', 'Rivadavia', -31.5333, -68.5961, 8),
    ('san-juan', 'Chimbas', -31.4833, -68.5333, 8),
    ('san-juan', 'Caucete', -31.6517, -68.2811, 8),
    ('san-luis', 'San Luis', -33.3017, -66.3378, 12),
    ('san-luis', 'Villa Mercedes', -33.6757, -65.4578, 12),
    ('san-luis', 'Merlo', -32.3429, -65.0138, 8),
    ('san-luis', 'Juana Koslay', -33.29, -66.25, 6),
    ('san-luis', 'La Punta', -33.1833, -66.3167, 6),
    ('santa-cruz', 'Río Gallegos', -51.623, -69.2168, 12),
    ('santa-cruz', 'Caleta Olivia', -46.4393, -67.5281, 10),
    ('santa-cruz', 'El Calafate', -50.3379, -72.2648, 8),
    ('santa-cruz', 'Pico Truncado', -46.7949, -67.9573, 8),
    ('santa-cruz', 'Puerto Deseado', -47.7503, -65.8939, 8),
    ('santa-fe', 'Santa Fe', -31.6333, -60.7, 15),
    ('santa-fe', 'Rosario', -32.9468, -60.6393, 20),
    ('santa-fe', 'Rafaela', -31.2503, -61.4867, 10),
    ('santa-fe', 'Venado Tuerto', -33.7456, -61.9688, 10),
    ('santa-fe', 'Reconquista', -29.15, -59.65, 10),
    ('santiago-del-estero', 'Santiago del Estero', -27.7951, -64.2615, 12),
    ('santiago-del-estero', 'La Banda', -27.7334, -64.2425, 8),
    ('santiago-del-estero', 'Termas de Río Hondo', -27.4932, -64.8597, 8),
    ('santiago-del-estero', 'Añatuya', -28.4661, -62.8333, 8),
    ('santiago-del-estero', 'Frías', -28.6496, -65.15, 8),
    ('tierra-del-fuego', 'Ushuaia', -54.8019, -68.303, 10),
    ('tierra-del-fuego', 'Río Grande', -53.7877, -67.7095, 10),
    ('tierra-del-fuego', 'Tolhuin', -54.5111, -67.19, 6),
    ('tucuman', 'San Miguel de Tucumán', -26.8083, -65.2176, 15),
    ('tucuman', 'Yerba Buena', -26.8163, -65.3164, 8),
    ('tucuman', 'Tafí Viejo', -26.7322, -65.2592, 8),
    ('tucuman', 'Concepción', -27.3433, -65.5925, 8),
    ('tucuman', 'Banda del Río Salí', -26.8366, -65.1636, 8)
) AS c(slug, name, lat, lng, radius)
JOIN provinces p ON p.slug = c.slug
WHERE NOT EXISTS (
    SELECT 1 FROM cities x WHERE x.province_id = p.id AND x.name = c.name
);

-- 3. RECALCULAR region_slug DE LO YA PUBLICADO -------------------------------------
-- Usa la ciudad cargada más cercana (aproximado, alcanza para datos existentes;
-- las publicaciones nuevas las clasifica la app con los límites reales de cada provincia).
UPDATE lost_reports r SET region_slug = (
    SELECT p.slug FROM cities c JOIN provinces p ON p.id = c.province_id
    WHERE p.slug IS NOT NULL
    ORDER BY c.center_location <-> r.last_seen_location LIMIT 1
);

UPDATE found_reports r SET region_slug = (
    SELECT p.slug FROM cities c JOIN provinces p ON p.id = c.province_id
    WHERE p.slug IS NOT NULL
    ORDER BY c.center_location <-> r.found_location LIMIT 1
);

UPDATE sightings r SET region_slug = (
    SELECT p.slug FROM cities c JOIN provinces p ON p.id = c.province_id
    WHERE p.slug IS NOT NULL
    ORDER BY c.center_location <-> r.location LIMIT 1
);
