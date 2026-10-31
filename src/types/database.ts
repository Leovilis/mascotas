export type UserRole = 'user' | 'moderator' | 'admin';
export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
export type PetGender = 'male' | 'female' | 'unknown';
export type PetSize = 'small' | 'medium' | 'large' | 'giant';
export type ReportStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'FOUND' | 'REUNITED' | 'CLOSED' | 'REMOVED';
export type SightingStatus = 'PENDING' | 'VERIFIED' | 'DISMISSED';
export type ModerationReason = 'false_information' | 'spam' | 'inappropriate_content' | 'scam' | 'duplicate' | 'other';
export type NotificationType = 'new_sighting' | 'possible_match' | 'geo_alert' | 'status_changed' | 'reputation_awarded' | 'system_message';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Country {
  id: string; // 'ARG'
  name: string;
}

export interface Province {
  id: number;
  country_id: string;
  name: string;
}

export interface City {
  id: number;
  province_id: number;
  name: string;
  center_location: GeoPoint;
  default_radius_km: number;
  created_at: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone?: string | null;
  whatsapp_enabled: boolean;
  avatar_url?: string | null;
  trust_score: number;
  reunited_count: number;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Pet {
  id: string;
  owner_id?: string | null;
  name?: string | null;
  species: PetSpecies;
  breed?: string | null;
  gender: PetGender;
  size: PetSize;
  primary_color: string;
  secondary_color?: string | null;
  distinctive_features?: string | null;
  photos: string[];
  created_at: string;
}

export interface LostReport {
  id: string;
  user_id: string;
  pet_id: string;
  city_id?: number | null;
  status: ReportStatus;
  last_seen_date: string;
  last_seen_location: GeoPoint;
  approximate_address: string;
  description: string;
  contact_phone?: string | null;
  contact_name?: string | null;
  contact_phone_public: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;
  // Campos expandidos opcionales
  pet?: Pet;
  profile?: Profile;
  distance_meters?: number;
  sightings_count?: number;
}

export interface FoundReport {
  id: string;
  finder_id: string;
  pet_id: string;
  city_id?: number | null;
  status: ReportStatus;
  found_date: string;
  found_location: GeoPoint;
  approximate_address: string;
  is_holding: boolean;
  description: string;
  contact_phone?: string | null;
  contact_name?: string | null;
  created_at: string;
  updated_at: string;
  // Campos expandidos opcionales
  pet?: Pet;
  profile?: Profile;
  distance_meters?: number;
}

export interface Sighting {
  id: string;
  user_id?: string | null;
  lost_report_id: string;
  location: GeoPoint;
  sighting_date: string;
  approximate_address: string;
  photo_url?: string | null;
  description: string;
  status: SightingStatus;
  created_at: string;
  distance_meters?: number;
}

export interface Match {
  id: string;
  lost_report_id: string;
  found_report_id: string;
  match_score: number;
  is_confirmed: boolean;
  dismissed_by_owner: boolean;
  dismissed_by_finder: boolean;
  created_at: string;
  lost_report?: LostReport;
  found_report?: FoundReport;
}

export interface UserAlertZone {
  id: string;
  user_id: string;
  center_location: GeoPoint;
  radius_meters: number;
  species_filter?: PetSpecies[] | null;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  resource_type?: string | null;
  resource_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ReputationEvent {
  id: string;
  user_id: string;
  report_id?: string | null;
  points_delta: number;
  reason: string;
  created_at: string;
}

export interface ModerationReport {
  id: string;
  reporter_id?: string | null;
  reported_entity_type: 'lost_report' | 'found_report' | 'sighting' | 'user';
  reported_entity_id: string;
  reason: ModerationReason;
  details?: string | null;
  resolved: boolean;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface QRCodeRecord {
  id: string;
  code_identifier: string;
  campaign_name: string;
  target_path: string;
  assigned_location_name?: string | null;
  approximate_location?: GeoPoint | null;
  scan_count: number;
  created_at: string;
}

export interface MapMarkerItem {
  marker_id: string;
  marker_type: 'lost' | 'found' | 'sighting';
  title: string;
  species: PetSpecies;
  photo_url?: string | null;
  latitude: number;
  longitude: number;
  report_date: string;
  approximate_address?: string;
  created_at?: string;
  is_holding?: boolean;
  detail_url?: string;
  sightings_count?: number;
}

export interface AdminDashboardStats {
  total_lost_reports: number;
  active_lost_reports: number;
  total_found_reports: number;
  active_found_reports: number;
  total_sightings: number;
  total_reunited_pets: number;
  total_users: number;
  total_pending_moderations: number;
  reports_by_city: Array<{ city_name: string; lost_count: number }>;
  recent_activity_last_7_days: {
    lost_created: number;
    found_created: number;
    sightings_created: number;
    reunited_count: number;
  };
}
