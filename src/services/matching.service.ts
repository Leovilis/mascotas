import { LostReport, FoundReport } from '@/types';

/**
 * Motor de Coincidencias basado en Reglas Ponderadas
 * Calcula la probabilidad de que una mascota encontrada corresponda a una mascota perdida.
 */
export function calculateMatchScore(lost: LostReport, found: FoundReport): number {
  if (!lost.pet || !found.pet) return 0;

  // 1. Especie obligatoria (si no coinciden, 0% de probabilidad)
  if (lost.pet.species !== found.pet.species) {
    return 0;
  }
  let score = 40; // Base por misma especie

  // 2. Sexo (15 pts)
  if (lost.pet.gender === found.pet.gender && lost.pet.gender !== 'unknown') {
    score += 15;
  } else if (lost.pet.gender === 'unknown' || found.pet.gender === 'unknown') {
    score += 8; // Incertidumbre parcial
  }

  // 3. Tamaño (15 pts)
  if (lost.pet.size === found.pet.size) {
    score += 15;
  }

  // 4. Color Principal (15 pts)
  const lostColor = lost.pet.primary_color.toLowerCase().trim();
  const foundColor = found.pet.primary_color.toLowerCase().trim();
  if (lostColor === foundColor || lostColor.includes(foundColor) || foundColor.includes(lostColor)) {
    score += 15;
  }

  // 5. Proximidad Geográfica (15 pts si están a menos de 3 km)
  if (lost.last_seen_location && found.found_location) {
    const distKm = getHaversineDistanceKm(
      lost.last_seen_location.latitude,
      lost.last_seen_location.longitude,
      found.found_location.latitude,
      found.found_location.longitude
    );

    if (distKm <= 1) {
      score += 15;
    } else if (distKm <= 3) {
      score += 10;
    } else if (distKm <= 6) {
      score += 5;
    }
  }

  return Math.min(100, Math.max(0, score));
}

export function getHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
