/**
 * Cloud Functions for user account management
 * V5.2 Architecture: Google OAuth + Firestore /users + Server-side authorization via ensureUserProfile
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as bcrypt from "bcrypt";

// Lazy initialization - admin will be initialized on first function call
let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

function initializeAdmin() {
  if (!db) {
    admin.initializeApp();
    db = admin.firestore();
    auth = admin.auth();
  }
}

/**
 * Interface for /users document
 */
interface WafiUser {
  uid: string;
  name: string;
  email: string;
  role: "student" | "parent" | "teacher" | "admin";
  status: "active" | "invited" | "disabled";
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Interface for /userCredentials document
 */
interface UserCredentials {
  uid: string;
  pinHash: string;
  failedAttempts: number;
  lockedUntil: admin.firestore.Timestamp | null;
  lastAttemptAt: admin.firestore.Timestamp | null;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * ensureUserProfile Cloud Function
 * V5.2 Architecture: Server-side authorization via Admin SDK
 *
 * Called by client after Google OAuth to verify email and create/sync /users document.
 * Client provides Firebase ID token (already verified by Firebase Auth).
 * Function queries /authorizedEmails (Admin SDK - not client-readable) to verify role/status.
 * Function creates/updates /users/{uid} with authorized values.
 * Client NEVER reads /authorizedEmails or chooses own role/status.
 *
 * Request:
 *   {idToken: string}  (Firebase ID token from client)
 *
 * Response:
 *   {ok: true, uid: string, role: string, status: string}
 *   {ok: false, reason: "auth-failed" | "email-not-authorized" | "account-disabled"}
 */
export const ensureUserProfile = functions.https.onCall(async (data, context) => {
  initializeAdmin();
  const { idToken } = data as { idToken?: string };

  // 1. Validate input
  if (!idToken) {
    console.warn("ensureUserProfile: Missing idToken");
    return { ok: false, reason: "auth-failed" };
  }

  let decodedToken: admin.auth.DecodedIdToken;

  try {
    // 2. Verify ID token with Firebase Admin SDK
    // This confirms the token is authentic and not forged
    decodedToken = await auth.verifyIdToken(idToken);
  } catch (error) {
    console.warn("ensureUserProfile: Invalid ID token", error);
    return { ok: false, reason: "auth-failed" };
  }

  const uid = decodedToken.uid;
  const email = decodedToken.email?.toLowerCase();

  if (!uid || !email) {
    console.warn("ensureUserProfile: Missing uid or email in token");
    return { ok: false, reason: "auth-failed" };
  }

  try {
    // 3. Query /authorizedEmails collection (Admin SDK - NOT client-readable)
    // This is the source of truth for user authorization
    const authorizedDoc = await db.collection("authorizedEmails").doc(email).get();

    if (!authorizedDoc.exists) {
      // Email not in authorized list - reject login
      console.warn(`ensureUserProfile: Email not authorized: ${email}`);
      // Optional: Delete Auth user to clean up
      // await auth.deleteUser(uid);
      return { ok: false, reason: "email-not-authorized" };
    }

    const authData = authorizedDoc.data();

    if (!authData) {
      console.warn(`ensureUserProfile: Empty authorization document for ${email}`);
      return { ok: false, reason: "email-not-authorized" };
    }

    const authorizedRole = authData.role as string;
    const authorizedStatus = authData.status as string;

    // 4. Validate role
    if (!["admin", "teacher", "parent", "student"].includes(authorizedRole)) {
      console.warn(`ensureUserProfile: Invalid authorized role: ${authorizedRole}`);
      return { ok: false, reason: "email-not-authorized" };
    }

    // 5. Check if account is disabled BEFORE creating /users document
    if (authorizedStatus === "disabled") {
      console.warn(`ensureUserProfile: Account disabled for ${email}`);
      return { ok: false, reason: "account-disabled" };
    }

    // 6. Create or update /users/{uid} using Admin SDK
    // Client can never modify role/status (Firestore Rules prevent it)
    // All fields come from /authorizedEmails, not client input
    const userData: WafiUser = {
      uid,
      email,
      name: authData.name || decodedToken.name || email.split("@")[0],
      role: authorizedRole as "admin" | "teacher" | "parent" | "student",
      status: authorizedStatus as "active" | "invited" | "disabled",
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Use merge: true to create or update (idempotent)
    await db.collection("users").doc(uid).set(userData, { merge: true });

    console.log(`ensureUserProfile: Created/updated /users/${uid} with role ${authorizedRole}`);

    // 7. Return confirmed profile
    // Client receives role/status but cannot modify them
    return {
      ok: true,
      uid,
      role: authorizedRole,
      status: authorizedStatus,
    };
  } catch (error) {
    console.error("ensureUserProfile error:", error);
    return { ok: false, reason: "auth-failed", error: (error as Error).message };
  }
});

/**
 * Create User Cloud Function
 * Creates Firebase Auth account + /users document + /userCredentials
 * Only callable by admin
 *
 * Compensating rollback:
 *   1. Create Auth user
 *   2. Create /users/{uid}
 *   3. Create /userCredentials/{uid}
 *   If step 2 or 3 fails: delete Auth user and any created Firestore docs
 *
 * Request:
 *   {name: string, email: string, role: string, pin: string}
 *
 * Response:
 *   {ok: true, uid: string}
 *   {ok: false, reason: "unauthorized" | "validation-error" | "email-exists" | "error"}
 */
export const createUser = functions.https.onCall(async (data, context) => {
  initializeAdmin();
  const { name, email, role, pin } = data as {
    name?: string;
    email?: string;
    role?: string;
    pin?: string;
  };

  // Verify caller is authenticated
  if (!context.auth?.uid) {
    return { ok: false, reason: "unauthenticated" };
  }

  // Verify caller is admin
  try {
    const adminUserSnap = await db.collection("users").doc(context.auth.uid).get();

    if (!adminUserSnap.exists) {
      return { ok: false, reason: "unauthorized" };
    }

    const adminUser = adminUserSnap.data() as WafiUser;

    if (adminUser.role !== "admin" || adminUser.status !== "active") {
      return { ok: false, reason: "unauthorized" };
    }
  } catch (error) {
    return { ok: false, reason: "unauthorized" };
  }

  // Validate input
  if (!name || !email || !role || !pin) {
    return { ok: false, reason: "validation-error", message: "Missing required fields" };
  }

  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return { ok: false, reason: "validation-error", message: "PIN must be 4 digits" };
  }

  if (!["student", "parent", "teacher"].includes(role)) {
    return { ok: false, reason: "validation-error", message: "Invalid role" };
  }

  let createdAuthUid: string | null = null;

  try {
    // Step 1: Create Firebase Auth account
    const authUser = await auth.createUser({
      email: email.toLowerCase(),
      disabled: false,
    });

    createdAuthUid = authUser.uid;
    console.log(`Created Auth user: ${createdAuthUid}`);

    // Step 2: Create /users/{uid} document
    const userDoc: WafiUser = {
      uid: createdAuthUid,
      name,
      email: email.toLowerCase(),
      role: role as "student" | "parent" | "teacher",
      status: "active",
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection("users").doc(createdAuthUid).set(userDoc);
    console.log(`Created /users/${createdAuthUid}`);

    // Step 3: Create /userCredentials/{uid}
    const pinHash = await bcrypt.hash(pin, 10);

    const credDoc: UserCredentials = {
      uid: createdAuthUid,
      pinHash,
      failedAttempts: 0,
      lockedUntil: null,
      lastAttemptAt: null,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection("userCredentials").doc(createdAuthUid).set(credDoc);
    console.log(`Created /userCredentials/${createdAuthUid}`);

    // Step 4: Set custom claims
    await auth.setCustomUserClaims(createdAuthUid, {
      role,
      email: email.toLowerCase(),
    });
    console.log(`Set custom claims for ${createdAuthUid}`);

    return { ok: true, uid: createdAuthUid };
  } catch (error) {
    console.error("createUser error:", error);

    // COMPENSATING ROLLBACK
    if (createdAuthUid) {
      try {
        // Delete Auth user
        await auth.deleteUser(createdAuthUid);
        console.log(`Rolled back Auth user: ${createdAuthUid}`);

        // Delete /users document
        await db.collection("users").doc(createdAuthUid).delete();
        console.log(`Rolled back /users/${createdAuthUid}`);

        // Delete /userCredentials document
        await db.collection("userCredentials").doc(createdAuthUid).delete();
        console.log(`Rolled back /userCredentials/${createdAuthUid}`);
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
        return {
          ok: false,
          reason: "rollback-failed",
          message: "User creation failed and rollback was incomplete. Manual cleanup required.",
          error: (error as Error).message,
        };
      }
    }

    return { ok: false, reason: "internal-error", error: (error as Error).message };
  }
});

/**
 * Update User Cloud Function
 * Updates /users document and syncs custom claims
 * Only callable by admin
 *
 * Request:
 *   {uid: string, patch: {name?, role?, status?}}
 *
 * Response:
 *   {ok: true}
 *   {ok: false, reason: "unauthorized" | "not-found"}
 */
export const updateUser = functions.https.onCall(async (data, context) => {
  initializeAdmin();
  const { uid, patch } = data as { uid?: string; patch?: Record<string, any> };

  // Verify caller is authenticated and admin
  if (!context.auth?.uid) {
    return { ok: false, reason: "unauthenticated" };
  }

  try {
    const adminUserSnap = await db.collection("users").doc(context.auth.uid).get();

    if (!adminUserSnap.exists) {
      return { ok: false, reason: "unauthorized" };
    }

    const adminUser = adminUserSnap.data() as WafiUser;

    if (adminUser.role !== "admin" || adminUser.status !== "active") {
      return { ok: false, reason: "unauthorized" };
    }
  } catch {
    return { ok: false, reason: "unauthorized" };
  }

  if (!uid || !patch) {
    return { ok: false, reason: "validation-error" };
  }

  try {
    // Update /users document
    await db.collection("users").doc(uid).update({
      ...patch,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If role or name changed, update custom claims
    if (patch.role || patch.name) {
      const userSnap = await db.collection("users").doc(uid).get();
      const user = userSnap.data() as WafiUser;

      await auth.setCustomUserClaims(uid, {
        role: user.role,
        email: user.email,
      });
    }

    return { ok: true };
  } catch (error) {
    console.error("updateUser error:", error);
    return { ok: false, reason: "internal-error", error: (error as Error).message };
  }
});

/**
 * Disable User Cloud Function
 * Sets status='disabled' and disables Firebase Auth
 * Revokes refresh tokens
 * Only callable by admin
 *
 * Request:
 *   {uid: string}
 *
 * Response:
 *   {ok: true}
 *   {ok: false, reason: "unauthorized" | "not-found"}
 */
export const disableUser = functions.https.onCall(async (data, context) => {
  initializeAdmin();
  const { uid } = data as { uid?: string };

  // Verify caller is authenticated and admin
  if (!context.auth?.uid) {
    return { ok: false, reason: "unauthenticated" };
  }

  try {
    const adminUserSnap = await db.collection("users").doc(context.auth.uid).get();

    if (!adminUserSnap.exists) {
      return { ok: false, reason: "unauthorized" };
    }

    const adminUser = adminUserSnap.data() as WafiUser;

    if (adminUser.role !== "admin" || adminUser.status !== "active") {
      return { ok: false, reason: "unauthorized" };
    }
  } catch {
    return { ok: false, reason: "unauthorized" };
  }

  if (!uid) {
    return { ok: false, reason: "validation-error" };
  }

  try {
    // Verify user exists
    const userSnap = await db.collection("users").doc(uid).get();

    if (!userSnap.exists) {
      return { ok: false, reason: "not-found" };
    }

    // Update /users: set status='disabled'
    await db.collection("users").doc(uid).update({
      status: "disabled",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Disable Firebase Auth account
    await auth.updateUser(uid, { disabled: true });

    // Revoke refresh tokens (invalidates all sessions)
    await auth.revokeRefreshTokens(uid);

    console.log(`Disabled user: ${uid}`);

    return { ok: true };
  } catch (error) {
    console.error("disableUser error:", error);
    return { ok: false, reason: "internal-error", error: (error as Error).message };
  }
});
