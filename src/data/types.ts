export type Faculty = 'NAT' | 'TECH' | 'HEALTH' | 'BSS' | 'ARTS' | 'AAA' | 'DMJX' | 'VIA';

export type Area =
  | 'Universitetsparken'
  | 'Universitetsbyen'
  | 'Nobelparken'
  | 'Katrinebjerg'
  | 'Midtbyen'
  | 'Frederiksbjerg';

export interface Opening {
  /** ISO-dato, fx 2026-09-04 */
  date: string;
  /** HH:MM */
  open: string;
  /** HH:MM – kan være efter midnat (fx 02:00 = næste dag) */
  close: string;
}

export interface WeeklyRule {
  /** 0 = søndag … 5 = fredag, 6 = lørdag */
  dow: number;
  open: string;
  close: string;
}

export interface Socials {
  instagram?: string;
  facebook?: string;
  website?: string;
  tiktok?: string;
}

export interface Bar {
  id: string;
  name: string;
  /** Hvem står bag / hvilket studie */
  subtitle: string;
  address: string;
  lat: number;
  lng: number;
  area: Area;
  faculty: Faculty;
  /** Institution: AU, AAA (Arkitektskolen), DMJX, VIA */
  institution: 'AU' | 'AAA' | 'DMJX' | 'VIA';
  tags: string[];
  about: string;
  verified?: boolean;
  rating?: number;
  socials?: Socials;
  openings: Opening[];
  weekly?: WeeklyRule[];
  hoursNote?: string;
  /** Filnavn i /public/logos */
  logo: string;
  /** Kort prisnote, fx "Øl fra 8 kr" */
  price?: string;
}

export interface Stop {
  barId: string;
  /** Minutter man bliver på stedet */
  minutes: number;
}

export interface Crawl {
  id: string;
  title: string;
  /** ISO-dato */
  date: string;
  /** HH:MM starttid */
  start: string;
  stops: Stop[];
  note?: string;
  author?: string;
  createdAt: number;
}
