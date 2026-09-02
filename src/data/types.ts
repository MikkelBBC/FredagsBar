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

/** ---------- Live-session ---------- */

export interface Member {
  id: string;
  name: string;
  emoji: string;
  joinedAt: number;
  lastSeen: number;
  /** Antal registrerede genstande */
  drinks: number;
  /** Antal glas vand - giver ogsaa XP */
  water: number;
  xp: number;
  /** Indeks paa det stop personen er ved (-1 = ikke ankommet) */
  stop: number;
  /** Gennemfoerte udfordringer */
  done: string[];
  /** Hemmelig mission (id fra MISSIONER) */
  mission?: string;
  missionDone?: boolean;
  /** Bingoplade: 9 indeks i BINGO_TILES */
  bingo?: number[];
  /** Krydsede felter (0-8) */
  bingoMarks?: number[];
  bingoLines?: number;
}

export type FeedType = 'join' | 'drink' | 'water' | 'checkin' | 'challenge' | 'msg' | 'cheers';

export interface FeedEvent {
  id: string;
  t: number;
  type: FeedType;
  memberId: string;
  name: string;
  emoji: string;
  text?: string;
  xp?: number;
}

export interface GameModes {
  /** Lykkehjul med konsekvenser */
  wheel: boolean;
  /** Regelmester: en faelles regel pr. stop */
  rules: boolean;
  /** Hemmelige missioner pr. deltager */
  missions: boolean;
  /** Bingoplade pr. deltager */
  bingo: boolean;
  /** Dobbelt XP paa sidste stop */
  finale: boolean;
}

export interface Session {
  code: string;
  crawl: Crawl;
  hostId: string;
  createdAt: number;
  modes: GameModes;
  /** Regel trukket for hvert stop: stopIndeks -> regel-id */
  rules?: Record<string, string>;
  members: Record<string, Member>;
  feed: Record<string, FeedEvent>;
}
