import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFunctions, type Functions } from 'firebase/functions';

// Firebase configuration from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env['VITE_FIREBASE_API_KEY'],
  authDomain: import.meta.env['VITE_FIREBASE_AUTH_DOMAIN'],
  projectId: import.meta.env['VITE_FIREBASE_PROJECT_ID'],
  storageBucket: import.meta.env['VITE_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: import.meta.env['VITE_FIREBASE_MESSAGING_SENDER_ID'],
  appId: import.meta.env['VITE_FIREBASE_APP_ID'],
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Cloud Functions
export const functions = getFunctions(app);

// Initialize Firebase Auth
let firebaseAuth: Auth | null = null;

// Firebase persistence configuration state
// Tracks whether persistence has been attempted to avoid concurrent attempts
let persistenceConfigured = false;

/**
 * Get or initialize Firebase Auth with persistence configured
 * Implements browserLocalPersistence to support session persistence in SSR environments
 */
export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(app);
    
    // Configure browserLocalPersistence if not already configured
    // Use .then().catch() to handle async completion without blocking critical auth operations
    // CRITICAL: This must NOT throw or prevent onAuthStateChanged from firing
    if (!persistenceConfigured) {
      persistenceConfigured = true;
      setPersistence(firebaseAuth, browserLocalPersistence)
        .then(() => {
          console.debug("[FIREBASE] Authentication persistence configured to browserLocalPersistence ✅");
        })
        .catch((error) => {
          console.warn("[FIREBASE] Failed to configure persistence (will use fallback):", error);
          // Do NOT rethrow - Firebase Auth can still work without persistence
          // onAuthStateChanged will still fire and sessions can be manually managed
        });
    }
  }
  return firebaseAuth;
}

// Initialize Firebase Authentication via function to ensure persistence is configured
export const auth = getFirebaseAuth();


