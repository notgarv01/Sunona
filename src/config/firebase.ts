import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Official Firebase configuration for SunoNa (Project: studybychat)
const firebaseConfig = {
  apiKey: "AIzaSyDrowADZO-9f0pW4SDtwrIgNSVYM1x6S-w",
  authDomain: "studybychat.firebaseapp.com",
  databaseURL: "https://studybychat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "studybychat",
  storageBucket: "studybychat.firebasestorage.app",
  messagingSenderId: "257910563216",
  appId: "1:257910563216:web:3627f1af920d2af70e1315",
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { app, auth, db };
