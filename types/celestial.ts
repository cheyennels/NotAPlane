export type CelestialType = 'star' | 'planet' | 'moon' | 'iss';

export interface CelestialBody {
  name: string;
  type: CelestialType;
  magnitude: number | null; // brightness, lower = brighter
  azimuth: number;          // degrees from north
  elevation: number;        // degrees above horizon
  visible: boolean;
  ra: number | null;        // right ascension
  dec: number | null;       // declination
}
