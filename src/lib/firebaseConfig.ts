/**
 * Firebase-opsætning til live-sessioner.
 *
 * Sådan gør du (gratis, ca. 5 minutter):
 *  1. Gå til https://console.firebase.google.com og opret et projekt (fx "mfc200").
 *  2. Byg → Realtime Database → Opret database → vælg "europe-west1" → start i TESTTILSTAND.
 *  3. Projektindstillinger (tandhjulet) → Dine apps → Web (</>) → registrér app.
 *  4. Kopiér værdierne fra firebaseConfig ind nedenfor.
 *  5. Regler (Realtime Database → Regler) – lås dem til sessioner og sæt en udløbsdato:
 *
 *     {
 *       "rules": {
 *         "sessions": {
 *           "$code": {
 *             ".read": true,
 *             ".write": true,
 *             ".validate": "newData.hasChildren(['code'])"
 *           }
 *         }
 *       }
 *     }
 *
 * Så længe felterne er tomme kører appen i "lokal tilstand": alt virker,
 * men kun i din egen browser (og andre faner på samme computer).
 */
export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  appId: '',
};

export const firebaseReady = (): boolean =>
  Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL);
