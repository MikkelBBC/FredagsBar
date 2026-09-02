/** Udfordringer til lykkehjulet. Inspireret af klassiske pub crawl-lege (bingo, terningedares, toasts). */

export type Rarity = 'almindelig' | 'sjaelden' | 'legendarisk';
export type Category = 'social' | 'foto' | 'fjol' | 'quiz' | 'drik' | 'hold';

export interface Challenge {
  id: string;
  text: string;
  category: Category;
  rarity: Rarity;
  /** XP man får for at gennemføre. */
  points: number;
  /** Kræver at man drikker alkohol – filtreres fra hvis man slår "uden alkohol" til. */
  alcohol?: boolean;
  /** Kun relevant på barer med et af disse fakulteter/tags. */
  only?: string[];
}

export const RARITY_META: Record<Rarity, { label: string; color: string; weight: number }> = {
  almindelig: { label: 'Almindelig', color: '#4d7d63', weight: 62 },
  sjaelden: { label: 'Sjælden', color: '#3b7dd8', weight: 30 },
  legendarisk: { label: 'Legendarisk', color: '#e0a13a', weight: 8 },
};

export const CATEGORY_META: Record<Category, { label: string; ico: string }> = {
  social: { label: 'Social', ico: '🗣️' },
  foto: { label: 'Foto', ico: '📸' },
  fjol: { label: 'Fjol', ico: '🤪' },
  quiz: { label: 'Quiz', ico: '🧠' },
  drik: { label: 'Drik', ico: '🍺' },
  hold: { label: 'Hold', ico: '🤝' },
};

export const CHALLENGES: Challenge[] = [
  // ---------- social ----------
  { id: 's1', text: 'Få en fremmed til at fortælle dig hvad de læser – og hvorfor de fortryder det.', category: 'social', rarity: 'almindelig', points: 15 },
  { id: 's2', text: 'Skål med et bord du ikke kender. Alle skal skåle tilbage.', category: 'social', rarity: 'almindelig', points: 10 },
  { id: 's3', text: 'Hold en 20 sekunders takketale for baren. Højt.', category: 'social', rarity: 'sjaelden', points: 25 },
  { id: 's4', text: 'Find en der har været på denne bar mere end 10 gange og få den bedste historie.', category: 'social', rarity: 'sjaelden', points: 25 },
  { id: 's5', text: 'Giv bartenderen en oprigtig kompliment om noget helt specifikt.', category: 'social', rarity: 'almindelig', points: 10 },
  { id: 's6', text: 'Lær tre nye navne udenad. Hele gruppen tester dig ved næste bar.', category: 'social', rarity: 'sjaelden', points: 30 },
  { id: 's7', text: 'Overbevis en fremmed om at du læser noget helt andet end du gør. I 2 minutter.', category: 'social', rarity: 'sjaelden', points: 25 },
  { id: 's8', text: 'Start en fælles skål for hele lokalet. Råb "SKÅL FOR FREDAGEN!"', category: 'social', rarity: 'legendarisk', points: 50 },
  { id: 's9', text: 'Spørg en fremmed om deres bedste råd til studiet og følg det resten af aftenen.', category: 'social', rarity: 'sjaelden', points: 25 },
  { id: 's10', text: 'Præsentér to fremmede for hinanden som om I alle er gamle venner.', category: 'social', rarity: 'almindelig', points: 15 },

  // ---------- foto ----------
  { id: 'f1', text: 'Tag et gruppebillede hvor alle laver det samme fjollede ansigt.', category: 'foto', rarity: 'almindelig', points: 10 },
  { id: 'f2', text: 'Tag det mest dramatiske "album cover"-billede af gruppen.', category: 'foto', rarity: 'sjaelden', points: 25 },
  { id: 'f3', text: 'Snuptagsbillede: fang en fra gruppen i det mest uheldige øjeblik.', category: 'foto', rarity: 'almindelig', points: 15 },
  { id: 'f4', text: 'Billede med barens logo eller skilt – alle skal med i frame.', category: 'foto', rarity: 'almindelig', points: 10 },
  { id: 'f5', text: 'Genskab et kendt maleri med gruppen som modeller.', category: 'foto', rarity: 'legendarisk', points: 50 },
  { id: 'f6', text: 'Selfie med en fremmed der siger ja til det. Ingen snyd.', category: 'foto', rarity: 'sjaelden', points: 30 },
  { id: 'f7', text: 'Film en 10 sekunders "reklame" for baren og vis den til gruppen.', category: 'foto', rarity: 'sjaelden', points: 30 },

  // ---------- fjol ----------
  { id: 'j1', text: 'Gå som en T-rex (albuer ind til siden) indtil I forlader baren.', category: 'fjol', rarity: 'sjaelden', points: 30 },
  { id: 'j2', text: 'Tal kun i spørgsmål de næste 5 minutter.', category: 'fjol', rarity: 'almindelig', points: 15 },
  { id: 'j3', text: 'Breakdance i 20 sekunder. Gruppen dømmer.', category: 'fjol', rarity: 'sjaelden', points: 30 },
  { id: 'j4', text: 'Find på et dansetrin og lær det til hele gruppen.', category: 'fjol', rarity: 'almindelig', points: 20 },
  { id: 'j5', text: 'Du er nu barens uofficielle guide. Giv en rundvisning til gruppen.', category: 'fjol', rarity: 'sjaelden', points: 25 },
  { id: 'j6', text: 'Tal med accent indtil næste bar. Vælg selv hvilken.', category: 'fjol', rarity: 'almindelig', points: 20 },
  { id: 'j7', text: 'Byt en trøje eller jakke med en fra gruppen indtil næste stop.', category: 'fjol', rarity: 'almindelig', points: 15 },
  { id: 'j8', text: 'Lav en 30 sekunders standup om noget der er sket i aften.', category: 'fjol', rarity: 'legendarisk', points: 50 },
  { id: 'j9', text: 'Du må ikke sige "øl", "bar" eller "fredag" resten af stoppet. Bryder du det: 10 XP fra.', category: 'fjol', rarity: 'sjaelden', points: 25 },
  { id: 'j10', text: 'Syng omkvædet på en sang gruppen vælger. Uden musik.', category: 'fjol', rarity: 'sjaelden', points: 30 },
  { id: 'j11', text: 'Gå baglæns hele vejen til baren. Kun hvis der er plads.', category: 'fjol', rarity: 'almindelig', points: 15 },

  // ---------- quiz ----------
  { id: 'q1', text: 'Nævn 5 fredagsbarer i Aarhus på 30 sekunder.', category: 'quiz', rarity: 'almindelig', points: 15 },
  { id: 'q2', text: 'Gæt hvad næste stop koster for en øl. Tættest på vinder.', category: 'quiz', rarity: 'almindelig', points: 15 },
  { id: 'q3', text: 'Ram klokkeslættet uden at kigge. Max 3 minutter fra.', category: 'quiz', rarity: 'sjaelden', points: 25 },
  { id: 'q4', text: 'Nævn alle i gruppen i alfabetisk rækkefølge. Uden hjælp.', category: 'quiz', rarity: 'almindelig', points: 15 },
  { id: 'q5', text: 'Hvor mange skridt er der til næste bar? Nærmeste 50 vinder.', category: 'quiz', rarity: 'sjaelden', points: 25 },
  { id: 'q6', text: 'Fortæl en sand og en falsk historie om dig selv. Gruppen gætter.', category: 'quiz', rarity: 'sjaelden', points: 25 },

  // ---------- hold ----------
  { id: 'h1', text: 'Hele gruppen skal skåle på samme tid uden at tælle ned. Bare mærk det.', category: 'hold', rarity: 'sjaelden', points: 25 },
  { id: 'h2', text: 'Find på et kampråb for turen. Det skal bruges ved hvert stop herefter.', category: 'hold', rarity: 'legendarisk', points: 45 },
  { id: 'h3', text: 'Alle skal sige én ting de sætter pris på ved personen til højre.', category: 'hold', rarity: 'sjaelden', points: 30 },
  { id: 'h4', text: 'Giv hinanden nye kaldenavne. De gælder resten af aftenen.', category: 'hold', rarity: 'almindelig', points: 20 },
  { id: 'h5', text: 'Alle lægger telefonen på bordet i 10 minutter. Første der rører den taber.', category: 'hold', rarity: 'sjaelden', points: 30 },
  { id: 'h6', text: 'Bestil noget til en anden i gruppen uden at spørge hvad de vil have.', category: 'hold', rarity: 'almindelig', points: 20 },
  { id: 'h7', text: 'Vælg en "kaptajn" for dette stop. Alle skal følge deres skåle.', category: 'hold', rarity: 'almindelig', points: 15 },
  { id: 'h8', text: 'Gruppen skal danne en menneskelig pyramide-positur til ét foto. Sikkert!', category: 'hold', rarity: 'legendarisk', points: 45 },

  // ---------- drik (kan slås fra) ----------
  { id: 'd1', text: 'Prøv en drikkevare du aldrig har smagt før på denne bar.', category: 'drik', rarity: 'almindelig', points: 20, alcohol: true },
  { id: 'd2', text: 'Bestil barens billigste og barens dyreste. Smag begge.', category: 'drik', rarity: 'sjaelden', points: 30, alcohol: true },
  { id: 'd3', text: 'Lad en anden bestemme hvad du drikker på dette stop.', category: 'drik', rarity: 'almindelig', points: 20, alcohol: true },
  { id: 'd4', text: 'Skål-runde: alle drikker en tår hver gang nogen siger "eksamen".', category: 'drik', rarity: 'almindelig', points: 15, alcohol: true },
  { id: 'd5', text: 'Giv en omgang til den i gruppen med færrest point lige nu.', category: 'drik', rarity: 'sjaelden', points: 35, alcohol: true },
  { id: 'd6', text: 'Drik et helt glas vand før næste øl. Fremtidige-dig takker dig.', category: 'drik', rarity: 'almindelig', points: 20 },
  { id: 'd7', text: 'Bestil noget alkoholfrit og lad som om det er det stærkeste på kortet.', category: 'drik', rarity: 'sjaelden', points: 25 },

  // ---------- fakultetsspecifikke ----------
  { id: 'x1', text: 'Forklar noget fra dit studie så en fuld person forstår det. På 60 sekunder.', category: 'quiz', rarity: 'sjaelden', points: 30 },
  { id: 'x2', text: 'Find en sten eller flise og hold et kort foredrag om dens geologi.', category: 'fjol', rarity: 'sjaelden', points: 30, only: ['NAT'] },
  { id: 'x3', text: 'Regn ud hvor mange øl der skal til for at fylde lokalet. Vis udregningen.', category: 'quiz', rarity: 'legendarisk', points: 45, only: ['NAT', 'TECH'] },
  { id: 'x4', text: 'Diagnosticér gruppens humør med et opdigtet, meget alvorligt fagudtryk.', category: 'fjol', rarity: 'sjaelden', points: 30, only: ['HEALTH'] },
  { id: 'x5', text: 'Lav en 30 sekunders elevatorpitch for en startup baseret på denne bar.', category: 'social', rarity: 'sjaelden', points: 30, only: ['BSS'] },
  { id: 'x6', text: 'Beskriv baren som var det et kunstværk i et museumskatalog.', category: 'fjol', rarity: 'sjaelden', points: 30, only: ['ARTS', 'AAA'] },
  { id: 'x7', text: 'Tegn barens grundplan på en serviet. Målfast, selvfølgelig.', category: 'foto', rarity: 'sjaelden', points: 30, only: ['AAA', 'TECH'] },
  { id: 'x8', text: 'Interview en fremmed som var det til forsiden. Med opfølgende spørgsmål.', category: 'social', rarity: 'sjaelden', points: 30, only: ['DMJX'] },
];

/** Vægtet tilfældigt træk, filtreret efter bar og indstillinger. */
export function drawChallenges(count: number, opts: { faculty?: string; noAlcohol?: boolean; exclude?: string[] } = {}): Challenge[] {
  const pool = CHALLENGES.filter((c) => {
    if (opts.noAlcohol && c.alcohol) return false;
    if (c.only && opts.faculty && !c.only.includes(opts.faculty)) return false;
    if (c.only && !opts.faculty) return false;
    if (opts.exclude?.includes(c.id)) return false;
    return true;
  });

  const picked: Challenge[] = [];
  const left = [...pool];
  while (picked.length < count && left.length) {
    const total = left.reduce((s, c) => s + RARITY_META[c.rarity].weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < left.length; i++) {
      r -= RARITY_META[left[i].rarity].weight;
      if (r <= 0) { idx = i; break; }
    }
    picked.push(left.splice(idx, 1)[0]);
  }
  return picked;
}

/** Niveauer – ren pynt, men det virker. */
export const LEVELS = [
  { xp: 0, title: 'Fadølsfærding', ico: '🌱' },
  { xp: 60, title: 'Bajerlærling', ico: '🍺' },
  { xp: 150, title: 'Fredagsven', ico: '🎒' },
  { xp: 300, title: 'Barkending', ico: '🧭' },
  { xp: 500, title: 'Fredagsbaron', ico: '🎩' },
  { xp: 800, title: 'Skålmester', ico: '🏆' },
  { xp: 1200, title: 'Aarhus-legende', ico: '👑' },
];

export function levelFor(xp: number) {
  let i = 0;
  for (let k = 0; k < LEVELS.length; k++) if (xp >= LEVELS[k].xp) i = k;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  const pct = next ? Math.round(((xp - cur.xp) / (next.xp - cur.xp)) * 100) : 100;
  return { level: i + 1, ...cur, next, pct };
}
