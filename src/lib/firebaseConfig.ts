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
  apiKey: 'AIzaSyBNdRv9AbClpUS8Aa2bihznbqMQt0bSx0U',
  authDomain: 'mfc200.firebaseapp.com',
  databaseURL: 'https://mfc200-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'mfc200',
  storageBucket: 'mfc200.firebasestorage.app',
  messagingSenderId: '798803031205',
  appId: '1:798803031205:web:f27a26df2ec9f4d68ac94c',
};

export const firebaseReady = (): boolean =>
  Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL);
