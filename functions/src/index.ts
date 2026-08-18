/**
 * Firebase Cloud Functions for Wafi Learning Buddy
 * V5.2 Architecture: Google OAuth + Firebase Auth + Firestore /users + Server-side authorization
 */

// Export all Cloud Functions (users.ts handles admin.initializeApp())
export { ensureUserProfile, createUser, updateUser, disableUser } from "./users.js";
