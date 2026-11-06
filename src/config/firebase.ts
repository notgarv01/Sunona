import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Firebase configuration from environment or fallback public demo project
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD-demo-sunona-music-app-client",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sunona-music.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sunona-music",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sunona-music.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "109827364512",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:109827364512:web:a1b2c3d4e5f6g7h8",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  console.warn('[Firebase] Initialization warning (offline/mock mode active):', err);
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { app, auth, db };
