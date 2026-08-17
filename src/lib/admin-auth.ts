/**
 * Admin Firebase Google Authentication Helper
 * 
 * Provides a minimal integration point for admin Google Sign-In.
 * Only the configured admin Google account (from VITE_FIREBASE_ADMIN_EMAIL) can authenticate.
 * After successful auth, admin can write to Firestore.
 */

import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';

const ADMIN_EMAIL = import.meta.env['VITE_FIREBASE_ADMIN_EMAIL'] || '';

/**
 * Initiates Google Sign-In for Admin.
 * Only the configured admin Google account (VITE_FIREBASE_ADMIN_EMAIL) is allowed.
 * Returns the user if successful, throws error otherwise.
 */
export async function signInAdminWithGoogle() {
  if (!ADMIN_EMAIL) {
    throw new Error('Admin email not configured. Set VITE_FIREBASE_ADMIN_EMAIL environment variable.');
  }

  const provider = new GoogleAuthProvider();
  
  try {
    const result = await signInWithPopup(auth, provider);
    
    // Verify the Google account email matches configured admin email
    if (result.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      // Sign out the non-admin account
      await firebaseSignOut(auth);
      throw new Error(`Only ${ADMIN_EMAIL} can authenticate as admin. You signed in with ${result.user.email}`);
    }
    
    return result.user;
  } catch (error: any) {
    // Re-throw with meaningful message
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Google Sign-In was cancelled');
    }
    throw error;
  }
}

/**
 * Signs out the current Firebase user.
 */
export async function signOutFirebase() {
  return firebaseSignOut(auth);
}

/**
 * Gets the current Firebase authentication state.
 * Returns the user object if authenticated, null otherwise.
 */
export function getCurrentFirebaseUser() {
  return auth.currentUser;
}

/**
 * Checks if the current user is authenticated with Firebase as the admin.
 */
export function isFirebaseAdminAuthenticated(): boolean {
  const user = auth.currentUser;
  return user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
