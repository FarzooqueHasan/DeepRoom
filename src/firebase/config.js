import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAF9THOzCEeXglfK-xG3RX-V3qmqJyWdwg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'deeproom-ff1be.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'deeproom-ff1be',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'deeproom-ff1be.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '92013733524',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:92013733524:web:4de4f124cc2e117607f681',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'your_api_key'
);

let app = null;
let auth = null;
let db = null;
let storage = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.info('[DeepRoom] Firebase successfully initialized.');
  } catch (error) {
    console.error('[DeepRoom] Firebase initialization error:', error);
  }
} else {
  console.info('[DeepRoom] Firebase credentials not found in env. Running in local reactive persistence mode.');
}

export { app, auth, db, storage };
