/**
 * Spilindhold til live-sessionen.
 *
 * Konsekvenserne bygger på de lister der findes i forvejen på nettet:
 * "Gode konsekvenser til væddemål" (godekonsekvensertil.com), woman.dk's
 * "70 spørgsmål og konsekvenser", hyg.dk's sandhed eller konsekvens, samt
 * reglerne fra Vandfald/Kongespil (shareboks.dk). De frække, klamme og
 * decideret farlige er sorteret fra – resten er skrevet om så de passer
 * til en fredagsbartur i Aarhus.
 */

export type Rarity = 'almindelig' | 'sjaelden' | 'legendarisk';
export type Category = 'social' | 'foto' | 'fjol' | 'quiz' | 'mod' | 'kreativ' | 'hold' | 'drik';

export interface Challenge {
  id: string;
  text: string;
  category: Category;
  rarity: Rarity;
  points: number;
  /** Kun relevant på barer fra disse fakulteter. */
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
  mod: { label: 'Mod', ico: '😤' },
  kreativ: { label: 'Kreativ', ico: '🎨' },
  hold: { label: 'Hold', ico: '🤝' },
  drik: { label: 'Drik', ico: '🍺' },
};

/* ---------------- konsekvenser til hjulet ---------------- */

export const CHALLENGES: Challenge[] = [
  // ----- lette -----
  { id: 'k1', text: 'Syng en sang a cappella foran gruppen. Fuld tekst, fuld stemme, ingen nåde.', category: 'fjol', rarity: 'almindelig', points: 20 },
  { id: 'k2', text: '30 squats. På stedet. Nu.', category: 'mod', rarity: 'almindelig', points: 15 },
  { id: 'k3', text: 'Du er gruppens butler indtil I går videre. Hent næste omgang og servér den pænt.', category: 'hold', rarity: 'almindelig', points: 20 },
  { id: 'k4', text: 'Gruppen skriver en status. Du poster den.', category: 'mod', rarity: 'almindelig', points: 20 },
  { id: 'k5', text: 'Lad en anden style dit hår. Frisuren bliver siddende til næste bar.', category: 'fjol', rarity: 'almindelig', points: 15 },
  { id: 'k6', text: 'Snak svensk resten af stoppet.', category: 'fjol', rarity: 'almindelig', points: 15 },
  { id: 'k7', text: 'Du skal spørge om lov, hver gang du rejser dig resten af stoppet.', category: 'fjol', rarity: 'almindelig', points: 15 },
  { id: 'k8', text: 'Lav din værste dyrelyd – og hold den i et helt minut.', category: 'fjol', rarity: 'almindelig', points: 15 },
  { id: 'k9', text: 'En anden bestemmer hvad du har på hovedet indtil næste stop.', category: 'fjol', rarity: 'almindelig', points: 15 },
  { id: 'k10', text: 'Vær en fra gruppens personlige tjener i 5 minutter.', category: 'hold', rarity: 'almindelig', points: 15 },
  { id: 'k11', text: 'Efterlign en fra gruppen så præcist og pinligt som muligt.', category: 'fjol', rarity: 'almindelig', points: 20 },
  { id: 'k12', text: 'Bestil noget med det dummeste navn på kortet. Sig hele navnet højt.', category: 'social', rarity: 'almindelig', points: 15 },
  { id: 'k13', text: 'Nævn tre gode egenskaber ved personen til venstre for dig.', category: 'hold', rarity: 'almindelig', points: 15 },
  { id: 'k14', text: 'Send en sød besked til en der ikke er med i aften.', category: 'social', rarity: 'almindelig', points: 15 },
  { id: 'k15', text: 'Fortæl om et yndlingsminde du har med en der står her.', category: 'hold', rarity: 'almindelig', points: 15 },
  { id: 'k16', text: 'Find på det bedste kælenavn til en fra gruppen. Det gælder resten af aftenen.', category: 'hold', rarity: 'almindelig', points: 20 },
  { id: 'k17', text: 'Skål med et bord du ikke kender. De skal skåle tilbage.', category: 'social', rarity: 'almindelig', points: 20 },
  { id: 'k18', text: 'Tag et gruppebillede hvor alle laver det samme fjollede ansigt.', category: 'foto', rarity: 'almindelig', points: 10 },
  { id: 'k19', text: 'Foto med barens logo eller skilt. Alle skal være med i billedet.', category: 'foto', rarity: 'almindelig', points: 10 },
  { id: 'k20', text: 'Drik et helt glas vand før næste genstand. Fremtidige-dig takker dig.', category: 'drik', rarity: 'almindelig', points: 20 },
  { id: 'k21', text: 'Gå som en T-rex – albuer ind til siden – indtil I forlader baren.', category: 'fjol', rarity: 'almindelig', points: 20 },
  { id: 'k22', text: 'Tal kun i spørgsmål de næste 5 minutter.', category: 'fjol', rarity: 'almindelig', points: 15 },
  { id: 'k23', text: 'Byt trøje eller jakke med en fra gruppen indtil næste stop.', category: 'fjol', rarity: 'almindelig', points: 20 },
  { id: 'k24', text: 'Giv bartenderen et kompliment om noget helt specifikt.', category: 'social', rarity: 'almindelig', points: 15 },

  // ----- modige -----
  { id: 'm1', text: 'Giv en fremmed et ærligt kompliment. Med øjenkontakt.', category: 'mod', rarity: 'sjaelden', points: 30 },
  { id: 'm2', text: 'Hold en to minutters motiverende tale for baren. Højt nok til at nogen kigger.', category: 'mod', rarity: 'sjaelden', points: 35 },
  { id: 'm3', text: 'Bestil næste omgang udelukkende med mimik og kropssprog.', category: 'mod', rarity: 'sjaelden', points: 35 },
  { id: 'm4', text: 'Dans med en fremmed. Ét nummer, hele nummeret.', category: 'mod', rarity: 'sjaelden', points: 35 },
  { id: 'm5', text: 'Tag en selfie med en tilfældig person. De skal sige ja først.', category: 'foto', rarity: 'sjaelden', points: 30 },
  { id: 'm6', text: 'Få bartenderen til at grine. Rigtigt grin, ikke af høflighed.', category: 'mod', rarity: 'sjaelden', points: 30 },
  { id: 'm7', text: 'Gå ind i den næste butik I passerer og spørg efter noget helt absurd.', category: 'mod', rarity: 'sjaelden', points: 35 },
  { id: 'm8', text: 'Gruppen bestemmer hvad du drikker på næste stop.', category: 'drik', rarity: 'sjaelden', points: 25 },
  { id: 'm9', text: 'Armstrækninger: 5 hver gang nogen siger "eksamen" resten af aftenen.', category: 'mod', rarity: 'sjaelden', points: 30 },
  { id: 'm10', text: 'Gruppen vælger hvad du spiser i morgen. Ingen indsigelser.', category: 'mod', rarity: 'sjaelden', points: 25 },
  { id: 'm11', text: 'Lad som om du lige har vundet X Factor. Syng dit sejrsnummer.', category: 'fjol', rarity: 'sjaelden', points: 35 },
  { id: 'm12', text: 'Scroll helt tilbage i din kamerarulle og vis det allerførste billede.', category: 'mod', rarity: 'sjaelden', points: 25 },
  { id: 'm13', text: 'Overbevis en fremmed om at du læser noget helt andet end du gør. I to minutter.', category: 'social', rarity: 'sjaelden', points: 30 },
  { id: 'm14', text: 'Find en der har været på denne bar mere end ti gange. Få den bedste historie.', category: 'social', rarity: 'sjaelden', points: 30 },
  { id: 'm15', text: 'Lær tre nye navne udenad. Gruppen tester dig ved næste bar.', category: 'social', rarity: 'sjaelden', points: 30 },
  { id: 'm16', text: 'Præsentér to fremmede for hinanden som om I alle er gamle venner.', category: 'social', rarity: 'sjaelden', points: 30 },
  { id: 'm17', text: 'Alle lægger telefonen på bordet i 10 minutter. Den første der rører sin, giver næste omgang.', category: 'hold', rarity: 'sjaelden', points: 30 },
  { id: 'm18', text: 'Film en 10 sekunders reklame for baren og vis den til gruppen.', category: 'foto', rarity: 'sjaelden', points: 30 },
  { id: 'm19', text: 'Genskab et kendt maleri med gruppen som modeller. Ét foto.', category: 'foto', rarity: 'sjaelden', points: 35 },
  { id: 'm20', text: 'Sig en sand og en falsk historie om dig selv. Gruppen gætter hvilken der er hvad.', category: 'quiz', rarity: 'sjaelden', points: 25 },
  { id: 'm21', text: 'Gæt hvad en øl koster på næste stop. Tættest på slipper for at hente den.', category: 'quiz', rarity: 'sjaelden', points: 25 },
  { id: 'm22', text: 'Hvor mange skridt er der til næste bar? Nærmeste 50 vinder.', category: 'quiz', rarity: 'sjaelden', points: 25 },
  { id: 'm23', text: 'Nævn fem fredagsbarer i Aarhus på 30 sekunder.', category: 'quiz', rarity: 'sjaelden', points: 25 },
  { id: 'm24', text: 'Find på et dansetrin og lær det til hele gruppen.', category: 'fjol', rarity: 'sjaelden', points: 30 },

  // ----- legendariske -----
  { id: 'l1', text: 'Skriv og fremfør en sang om aftenen til en melodi alle kender.', category: 'kreativ', rarity: 'legendarisk', points: 60 },
  { id: 'l2', text: 'Hold en ordentlig skåltale for gruppen. Forberedt, med pointe og afslutning.', category: 'kreativ', rarity: 'legendarisk', points: 50 },
  { id: 'l3', text: 'Tegn et portræt af en fra gruppen. Det skal med hjem.', category: 'kreativ', rarity: 'legendarisk', points: 50 },
  { id: 'l4', text: 'Start en fælles skål for hele lokalet: "SKÅL FOR FREDAGEN!"', category: 'mod', rarity: 'legendarisk', points: 55 },
  { id: 'l5', text: 'Du arrangerer næste fredagstur. Dato, rute, invitation – det hele.', category: 'hold', rarity: 'legendarisk', points: 50 },
  { id: 'l6', text: 'Overtag en fra gruppens kedeligste husholdningsopgave i en uge.', category: 'hold', rarity: 'legendarisk', points: 50 },
  { id: 'l7', text: 'Find på et kampråb for turen. Det skal bruges ved hvert eneste stop herefter.', category: 'hold', rarity: 'legendarisk', points: 50 },
  { id: 'l8', text: 'Bær en trøje med gruppens valgte tekst næste gang I går i byen.', category: 'mod', rarity: 'legendarisk', points: 50 },
  { id: 'l9', text: 'Lav en tre-retters middag for gruppen inden semesteret er slut.', category: 'kreativ', rarity: 'legendarisk', points: 60 },
  { id: 'l10', text: 'Hold en 30 sekunders standup om noget der er sket i aften. Foran gruppen.', category: 'kreativ', rarity: 'legendarisk', points: 55 },

  // ----- fakultetsspecifikke -----
  { id: 'x1', text: 'Forklar noget fra dit studie så en meget træt person forstår det. På 60 sekunder.', category: 'quiz', rarity: 'sjaelden', points: 30 },
  { id: 'x2', text: 'Find en sten eller en flise og hold et kort, meget seriøst foredrag om dens geologi.', category: 'fjol', rarity: 'sjaelden', points: 30, only: ['NAT'] },
  { id: 'x3', text: 'Regn ud hvor mange øl der skal til for at fylde lokalet. Vis udregningen.', category: 'quiz', rarity: 'legendarisk', points: 50, only: ['NAT', 'TECH'] },
  { id: 'x4', text: 'Diagnosticér gruppens humør med et opdigtet, meget alvorligt fagudtryk.', category: 'fjol', rarity: 'sjaelden', points: 30, only: ['HEALTH'] },
  { id: 'x5', text: 'Hold en elevatorpitch for en startup baseret udelukkende på denne bar.', category: 'social', rarity: 'sjaelden', points: 30, only: ['BSS'] },
  { id: 'x6', text: 'Beskriv baren som var det et værk i et museumskatalog.', category: 'kreativ', rarity: 'sjaelden', points: 30, only: ['ARTS', 'AAA'] },
  { id: 'x7', text: 'Tegn barens grundplan på en serviet. Målfast, selvfølgelig.', category: 'kreativ', rarity: 'sjaelden', points: 30, only: ['AAA', 'TECH'] },
  { id: 'x8', text: 'Interview en fremmed som var det til forsiden. Med opfølgende spørgsmål.', category: 'social', rarity: 'sjaelden', points: 30, only: ['DMJX'] },
];

/** Vægtet tilfældigt træk, filtreret efter bar og allerede brugte. */
export function drawChallenges(count: number, opts: { faculty?: string; exclude?: string[] } = {}): Challenge[] {
  const pool = CHALLENGES.filter((c) => {
    if (c.only && (!opts.faculty || !c.only.includes(opts.faculty))) return false;
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

/* ---------------- regelmester (fra Vandfald / Kongespil) ---------------- */

export interface Regel {
  id: string;
  ico: string;
  title: string;
  text: string;
}

export const REGLER: Regel[] = [
  { id: 'r1', ico: '👍', title: 'Tommelfingermester', text: 'Du kan når som helst sætte tommelfingeren på bordet. Den sidste der opdager det, giver en tår.' },
  { id: 'r2', ico: '🤫', title: 'Forbudte ord', text: '"Øl", "bar" og "fredag" er bandlyst på dette stop. Den der siger et af dem, mister 10 XP.' },
  { id: 'r3', ico: '🗣️', title: 'Spørgsmålsmester', text: 'Der må kun tales i spørgsmål. Den der svarer normalt, har tabt.' },
  { id: 'r4', ico: '🤝', title: 'Venner', text: 'Alle vælger en makker. I følges ad i alt hvad I bestiller resten af stoppet.' },
  { id: 'r5', ico: '🎵', title: 'Rim', text: 'Alt hvad I siger skal rime på det sidste ord den forrige sagde. Første der går i stå, taber.' },
  { id: 'r6', ico: '📚', title: 'Kategorier', text: 'Vælg en kategori. Rundt om bordet skal alle nævne noget i den. Første der går i stå, taber.' },
  { id: 'r7', ico: '👈', title: 'Forkert hånd', text: 'Alle drikker med den forkerte hånd på dette stop.' },
  { id: 'r8', ico: '🙅', title: 'Ingen navne', text: 'Ingen må sige hinandens rigtige navne. Brug kælenavne.' },
  { id: 'r9', ico: '🫵', title: 'Mod himlen', text: 'Når nogen siger "skål", peger alle op. Den sidste taber.' },
  { id: 'r10', ico: '📵', title: 'Telefoner ned', text: 'Alle telefoner på bordet. Den første der rører sin, giver næste omgang.' },
  { id: 'r11', ico: '🎩', title: 'Kaptajnen', text: 'Vælg en kaptajn for dette stop. Alle skåler når kaptajnen skåler.' },
  { id: 'r12', ico: '🐌', title: 'Slowmotion', text: 'Alle bevægelser i slowmotion når nogen råber "SLOW". Varer 10 sekunder.' },
];

/* ---------------- hemmelige missioner ---------------- */

export interface Mission {
  id: string;
  text: string;
  points: number;
}

export const MISSIONER: Mission[] = [
  { id: 'h1', text: 'Få hele gruppen til at bruge dit yndlingsord mindst fem gange uden de opdager hvorfor.', points: 40 },
  { id: 'h2', text: 'Få en anden til at foreslå at I går videre til næste bar.', points: 30 },
  { id: 'h3', text: 'Tag et billede af hver eneste person i gruppen uden de opdager det.', points: 45 },
  { id: 'h4', text: 'Få nogen til at spørge om du har fået nyt hår eller nyt tøj.', points: 35 },
  { id: 'h5', text: 'Skift plads tre gange uden at nogen nævner det.', points: 35 },
  { id: 'h6', text: 'Få gruppen til at skåle mindst fem gange på ét stop.', points: 30 },
  { id: 'h7', text: 'Få en fremmed til at sætte sig ved jeres bord.', points: 45 },
  { id: 'h8', text: 'Lær navnet på tre du ikke kendte, og få dem sagt højt i gruppen.', points: 40 },
  { id: 'h9', text: 'Få nogen til at citere noget du sagde tidligere på aftenen.', points: 35 },
  { id: 'h10', text: 'Få gruppen til at diskutere et emne du selv har plantet – i mindst fem minutter.', points: 40 },
  { id: 'h11', text: 'Sørg for at alle har fået et glas vand inden aftenen er slut.', points: 40 },
  { id: 'h12', text: 'Få en anden til at tage initiativ til et gruppebillede.', points: 30 },
];

/* ---------------- bingo ---------------- */

export const BINGO_TILES: string[] = [
  'Nogen taber en øl',
  'En fremmed skåler med jer',
  'Nogen taler om eksamen',
  'Der spilles en sang alle synger med på',
  'Kø ved baren i over 5 minutter',
  'Nogen viser et billede på telefonen',
  'I møder nogen I kender',
  'Nogen kommer for sent til stoppet',
  'En bartender griner',
  'Nogen tager en gruppeselfie',
  'Der bliver talt om vejret',
  'Nogen siger "hyggeligt"',
  'Der er udsolgt af noget',
  'Nogen råber "SKÅL!"',
  'To taler i munden på hinanden',
  'Nogen fortæller den samme historie to gange',
  'Nogen låner en oplader',
  'Der bliver diskuteret hvor I skal hen bagefter',
];

export function drawBingo(): number[] {
  const idx = BINGO_TILES.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, 9);
}

/** Vandrette, lodrette og diagonale linjer i en 3x3-plade. */
export const BINGO_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

/* ---------------- niveauer ---------------- */

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
