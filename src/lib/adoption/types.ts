/** Tipos y etiquetas del módulo de adopción (sirven en servidor y navegador) */

export type AssociationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type AnimalStatus = 'AVAILABLE' | 'RESERVED' | 'ADOPTED';
export type AnimalSpecies = 'dog' | 'cat' | 'other';
export type AnimalSex = 'male' | 'female' | 'unknown';
export type AnimalSize = 'small' | 'medium' | 'large';
export type RequestStatus = 'PENDING' | 'REJECTED' | 'APPROVED' | 'CANCELLED';
export type RegistryStatus = 'PENDING' | 'REGISTERED' | 'NOT_APPLICABLE';

export interface Association {
  id: string;
  owner_id: string;
  region_slug: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string;
  instagram: string | null;
  logo_url: string | null;
  status: AssociationStatus;
  admin_notes: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface AdoptionAnimal {
  id: string;
  association_id: string;
  region_slug: string;
  name: string;
  species: AnimalSpecies;
  breed: string | null;
  sex: AnimalSex;
  size: AnimalSize | null;
  age: string | null;
  description: string | null;
  neutered: boolean;
  photos: string[];
  status: AnimalStatus;
  created_at: string;
}

export interface AdopterProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  dni: string;
  email: string;
  phone: string;
  address: string;
  city: string | null;
  region_slug: string | null;
}

export interface Vaccine {
  id: string;
  animal_id: string;
  name: string;
  applied_on: string;
  next_due: string | null;
}

export interface Followup {
  id: string;
  animal_id: string;
  date: string;
  note: string;
}

export interface AdoptionRequest {
  id: string;
  animal_id: string;
  user_id: string;
  message: string | null;
  status: RequestStatus;
  created_at: string;
}

export interface AdoptionRecord {
  id: string;
  animal_id: string;
  adopter_id: string;
  adopted_on: string;
  record_code: string;
  registry_status: RegistryStatus;
  registry_number: string | null;
  registry_date: string | null;
}

export const SPECIES_LABEL: Record<AnimalSpecies, string> = { dog: 'Perro', cat: 'Gato', other: 'Otro' };
export const SPECIES_EMOJI: Record<AnimalSpecies, string> = { dog: '🐶', cat: '🐱', other: '🐾' };
export const SEX_LABEL: Record<AnimalSex, string> = { male: 'Macho', female: 'Hembra', unknown: 'Sin dato' };
export const SIZE_LABEL: Record<AnimalSize, string> = { small: 'Chico', medium: 'Mediano', large: 'Grande' };
export const ANIMAL_STATUS_LABEL: Record<AnimalStatus, string> = {
  AVAILABLE: 'En adopción',
  RESERVED: 'Reservado',
  ADOPTED: 'Adoptado',
};
export const ASSOCIATION_STATUS_LABEL: Record<AssociationStatus, string> = {
  PENDING: 'Pendiente de aprobación',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  SUSPENDED: 'Suspendida',
};
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: 'En revisión',
  REJECTED: 'No aprobada',
  APPROVED: '¡Aprobada!',
  CANCELLED: 'Cancelada',
};
export const REGISTRY_STATUS_LABEL: Record<RegistryStatus, string> = {
  PENDING: 'Pendiente de inscripción',
  REGISTERED: 'Inscripta',
  NOT_APPLICABLE: 'No corresponde',
};
