export type Access = 'private' | 'semi' | 'public';

export type MustPlayStatus = '' | 'planned' | 'booked' | 'unicorn';

// How realistic getting on actually is.
export type PathToPlay = '' | 'book' | 'resort' | 'invite' | 'pray';

export interface Course {
  id: number;
  name: string;
  city: string;
  state: string;
  country: string;
  lat: number | null;
  lng: number | null;
  rating: number | null; // course rating, e.g. 74.1
  slope: number | null;
  gross: number | null; // most recent score
  low_score: number | null; // personal best
  stars: number; // 1-5, my rating (0 = unrated)
  date: string; // last played, ISO (may be '')
  designer: string;
  access: Access;
  gd100: boolean; // Golf Digest Top 100
  gm100: boolean; // Golf Magazine Top 100
  replay: boolean; // want-to-replay flag
  notes: string;
  url: string;
  geo_verified: boolean; // false = coordinate needs a human spot-check
}

export interface MustPlay {
  id: number;
  name: string;
  city: string;
  state: string;
  country: string;
  lat: number | null;
  lng: number | null;
  access: Access;
  url: string;
  status: MustPlayStatus; // '' = wishlist
  notes: string;
  gd100: boolean;
  gm100: boolean;
  geo_verified: boolean;
  designer: string;
  path: PathToPlay;
  tee_date: string; // ISO date of a booked tee time (countdown source)
}

export interface DataSet {
  courses: Course[];
  mustplay: MustPlay[];
}

export type View = 'courses' | 'mustplay' | 'stats' | 'map';
