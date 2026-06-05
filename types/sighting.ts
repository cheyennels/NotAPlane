export type SightingStatus = 'pending' | 'explained' | 'partial' | 'unexplained';

export type Shape =
  | 'sphere_orb'
  | 'cigar'
  | 'disc'
  | 'triangle'
  | 'unknown_other';

export type Sound = 'silent' | 'humming' | 'buzzing' | 'loud' | 'other';

export type Direction = 'north' | 'south' | 'east' | 'west'
  | 'northeast' | 'northwest' | 'southeast' | 'southwest';

export type Altitude = 'low' | 'medium' | 'high' | 'unknown';

export type MovementType = 'hovering' | 'erratic' | 'steady' | 'stationary';

export interface Sighting {
  id: string;
  user_id: string;
  sighted_at: string;
  duration_seconds: number | null;
  latitude: number;
  longitude: number;
  location_label: string | null;
  description: string | null;
  shape: Shape | null;
  color: string[];
  sound: Sound | null;
  photo_url: string | null;
  direction: Direction | null;
  altitude: Altitude | null;
  movement_type: MovementType | null;
  status: SightingStatus;
  matched_flight: string | null;
  matched_celestial: string | null;
  created_at: string;
  corroborations?: number;
}

export interface ReportForm {
  // Step 1
  sighted_at: Date;
  duration_seconds: number | null;
  // Step 2
  latitude: number | null;
  longitude: number | null;
  use_current_location: boolean;
  // Step 3
  description: string;
  shape: Shape | null;
  color: string[];
  sound: Sound | null;
  photo_uri: string | null;
  // Step 4
  direction: Direction | null;
  altitude: Altitude | null;
  movement_type: MovementType | null;
}
