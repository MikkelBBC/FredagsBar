# MikkelFredagsCafe200

Fredagsbar-app til Aarhus. 38 fredagsbarer og studenterbarer med åbningstider, kort,
turplanlægger, delelink, lykkehjul og live-session med point.

## Kør lokalt

```bash
npm install
npm run dev
```

## Læg den på nettet (GitHub Pages)

Der ligger en workflow i `.github/workflows/deploy.yml`. Første gang:

1. Push til `main` på GitHub.
2. GitHub → Settings → Pages → Source: **GitHub Actions**.
3. Linket bliver `https://<brugernavn>.github.io/<repo>/` – det er dét, du sender til vennerne.

`vite.config.ts` bruger `base: './'`, så appen virker både i en undermappe og på et rod-domæne.

## Hvad kan den

| Skærm | Indhold |
| --- | --- |
| **I dag** | Hvem har åbent lige nu, hvem åbner senere, tættest på dig, næste fredag |
| **Kort** | Alle barer med logo som markør, filtrér på åbne/favoritter/din tur, ruteoptegning |
| **Barer** | Søgning, filtre på fakultet og område, sortering efter afstand eller åbningstid |
| **Bar** | Åbningsdatoer, om baren, sociale links, rute i Google Maps, dine besøg |
| **Tur** | Stop, rækkefølge, opholdstid, rigtig gårute, advarsler om åbningstider, delelink, `.ics` |
| **Live** | Session med kode: tilmelding, XP, stilling, genstande, lykkehjul, feed |
| **Mig** | Navn, tema, statistik, badges, favoritter, gemte ture |

## Live-sessioner: slå deling til

Uden opsætning kører live-sessioner i **lokal tilstand** – de virker, men kun i din egen browser.
For at vennerne kan være med fra deres egne telefoner skal der en gratis Firebase-database til:

1. Gå til <https://console.firebase.google.com> og opret et projekt (fx `mfc200`).
2. **Build → Realtime Database → Create Database** → region `europe-west1` → start i **testtilstand**.
3. **Projektindstillinger (tandhjul) → Dine apps → Web (`</>`)** → registrér appen.
4. Kopiér værdierne fra `firebaseConfig` ind i [`src/lib/firebaseConfig.ts`](src/lib/firebaseConfig.ts).
5. Sæt reglerne under **Realtime Database → Rules**:

```json
{
  "rules": {
    "sessions": {
      "$code": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['code'])"
      }
    }
  }
}
```

Reglerne er med vilje åbne for alle med koden – der er ingen login i appen. Læg ikke
noget følsomt i en session.

## Data

Barerne ligger i [`src/data/bars.ts`](src/data/bars.ts) med adresse, koordinater, fakultet,
beskrivelse og alle åbningsdatoer for semesteret. Udfordringerne til lykkehjulet ligger i
[`src/data/challenges.ts`](src/data/challenges.ts).

Åbningstiderne er tastet manuelt ind fra barernes egne opslag – tjek altid barens kanaler
før I går. Logoerne i `public/logos/` tilhører de enkelte barer.

## Teknik

React 18 + TypeScript + Vite, Leaflet til kort, OSRM til gåruter, Firebase Realtime Database
til live-sessioner (kun indlæst når en session køres). Alt andet gemmes i browserens
`localStorage` – ingen konto, ingen server, ingen sporing.
