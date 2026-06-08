import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app = null;
let db = null;
let auth = null;
let firebaseInitError = null;

function isConfigComplete(config) {
  return Object.values(config).every((value) => typeof value === 'string' && value.length > 0);
}

if (!isConfigComplete(firebaseConfig)) {
  firebaseInitError = new Error(
    'Firebase no está configurado correctamente. Revisa tus variables de entorno VITE_FIREBASE_*.'
  );
} else {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (err) {
    firebaseInitError = err;
    console.error('Firebase initialization error:', err);
  }
}

export { db, auth, firebaseInitError };
