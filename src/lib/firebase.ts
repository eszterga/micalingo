import { Capacitor } from '@capacitor/core';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAVlTHTkaiwYYIz_-KuIJBHKA7NYaWqwTA",
    authDomain: "micalingo.firebaseapp.com",
    projectId: "micalingo",
    storageBucket: "micalingo.firebasestorage.app",
    messagingSenderId: "751419081791",
    appId: "1:751419081791:web:3e6754ac2ce6ac8a9ea48a"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Persistent IndexedDB cache helps desktop quizzes; on native WebViews it often
// serves stale empty results for library pages — use memory cache there instead.
let db: Firestore;
try {
  if (Capacitor.isNativePlatform()) {
    db = getFirestore(app);
  } else {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  }
} catch {
  db = getFirestore(app);
}

// On native, IndexedDB persistence keeps the JS auth session across app restarts
// (required when bridging native Google Sign-In into the Firebase JS SDK).
function createAuth(firebaseApp: FirebaseApp): Auth {
  if (Capacitor.isNativePlatform()) {
    try {
      return initializeAuth(firebaseApp, {
        persistence: indexedDBLocalPersistence,
      });
    } catch {
      return getAuth(firebaseApp);
    }
  }
  return getAuth(firebaseApp);
}

// Export the necessary Firebase services
export const auth: Auth = createAuth(app);
export { db };
export const dbCloud: Firestore = db;
export default app;
