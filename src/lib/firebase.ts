import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

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

// Export the necessary Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const dbCloud: Firestore = db;
export default app;