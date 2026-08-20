import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth, db } from "./firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "sonner";

export type Role = "student" | "parent" | "teacher" | "admin";

export type FeatureKey =
  | "dashboard"
  | "study"
  | "homework"
  | "ai-teacher"
  | "scan"
  | "vocabulary"
  | "pronunciation"
  | "question-bank"
  | "practice"
  | "games"
  | "progress"
  | "parent-mode"
  | "planner"
  | "notifications"
  | "documents"
  | "achievements"
  | "ai-memory"
  | "school-profile"
  | "admin";

export const features: { key: FeatureKey; emoji: string; en: string; bn: string }[] = [
  { key: "dashboard", emoji: "🏠", en: "Dashboard", bn: "ড্যাশবোর্ড" },
  { key: "study", emoji: "📚", en: "Study", bn: "পড়াশোনা" },
  { key: "homework", emoji: "📝", en: "Homework", bn: "হোমওয়ার্ক" },
  { key: "ai-teacher", emoji: "🤖", en: "AI Teacher", bn: "এআই শিক্ষক" },
  { key: "scan", emoji: "📷", en: "AI Scan", bn: "এআই স্ক্যান" },
  { key: "vocabulary", emoji: "📖", en: "Vocabulary", bn: "শব্দভাণ্ডার" },
  { key: "pronunciation", emoji: "🎤", en: "Pronunciation", bn: "উচ্চারণ" },
  { key: "question-bank", emoji: "🗂️", en: "Question Bank", bn: "প্রশ্নব্যাংক" },
  { key: "practice", emoji: "🧠", en: "Practice", bn: "অনুশীলন" },
  { key: "games", emoji: "🎮", en: "Games", bn: "গেম" },
  { key: "progress", emoji: "📊", en: "Progress", bn: "অগ্রগতি" },
  { key: "parent-mode", emoji: "👨‍👩‍👦", en: "Parent Mode", bn: "প্যারেন্ট মোড" },
  { key: "planner", emoji: "📅", en: "Planner", bn: "প্ল্যানার" },
  { key: "notifications", emoji: "🔔", en: "Notifications", bn: "নোটিফিকেশন" },
  { key: "documents", emoji: "📁", en: "Documents", bn: "ডকুমেন্ট" },
  { key: "achievements", emoji: "🏆", en: "Achievements", bn: "অর্জন" },
  { key: "ai-memory", emoji: "🧬", en: "AI Memory", bn: "এআই মেমোরি" },
  { key: "school-profile", emoji: "🏫", en: "School Profile", bn: "স্কুল প্রোফাইল" },
  { key: "admin", emoji: "🛡️", en: "Admin Panel", bn: "অ্যাডমিন প্যানেল" },
];

export const roleLabels: Record<Role, { en: string; bn: string; emoji: string }> = {
  student: { en: "Student", bn: "শিক্ষার্থী", emoji: "👦" },
  parent: { en: "Parent", bn: "অভিভাবক", emoji: "👨‍👩‍👦" },
  teacher: { en: "Teacher", bn: "শিক্ষক", emoji: "👩‍🏫" },
  admin: { en: "Admin", bn: "অ্যাডমিন", emoji: "🛡️" },
};

export const rolePresets: Record<Role, FeatureKey[]> = {
  student: [
    "dashboard",
    "study",
    "homework",
    "ai-teacher",
    "scan",
    "vocabulary",
    "pronunciation",
    "question-bank",
    "practice",
    "games",
    "progress",
    "planner",
    "notifications",
    "documents",
    "achievements",
  ],
  parent: [
    "dashboard",
    "parent-mode",
    "progress",
    "homework",
    "planner",
    "notifications",
    "documents",
    "achievements",
    "ai-memory",
    "school-profile",
  ],
  teacher: [
    "dashboard",
    "study",
    "homework",
    "question-bank",
    "practice",
    "progress",
    "planner",
    "notifications",
    "documents",
    "school-profile",
  ],
  admin: features.map((f) => f.key),
};

export type AccessUser = {
  uid: string;
  name: string;
  email: string;
  photoURL?: string | null;
  role: Role;
  status: "active" | "invited" | "disabled";
  permissions: FeatureKey[];
};

type AccessState = {
  currentUser: AccessUser | null;
  authReady: boolean;
  signInWithGoogle: () => Promise<{ ok: boolean; reason?: string }>;
  signOut: () => void;
  can: (key: FeatureKey) => boolean;
};

const AccessContext = createContext<AccessState | null>(null);

const SESSION_KEY = "wafi.session.email";
const rawAdminEmail =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_FIREBASE_ADMIN_EMAIL) ||
  (typeof process !== "undefined" && process.env?.["VITE_FIREBASE_ADMIN_EMAIL"]) ||
  "";
const ADMIN_EMAIL = rawAdminEmail.trim().toLowerCase();

export function AccessProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AccessUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[ACCESS] onAuthStateChanged fired:", {
        hasUser: !!firebaseUser,
        firebaseUserEmail: firebaseUser?.email,
        firebaseUserUid: firebaseUser?.uid,
      });

      if (firebaseUser && firebaseUser.email) {
        const normalizedEmail = firebaseUser.email.trim().toLowerCase();
        const uid = firebaseUser.uid;

        try {
          // 1. Safely fetch both /users/{uid} and /authorizedEmails/{normalizedEmail}
          const userDocRef = doc(db, "users", uid);
          const authDocRef = doc(db, "authorizedEmails", normalizedEmail);

          const [userResult, authResult] = await Promise.allSettled([
            getDoc(userDocRef),
            getDoc(authDocRef),
          ]);

          const userDocSnap = userResult.status === "fulfilled" ? userResult.value : null;
          const authDocSnap = authResult.status === "fulfilled" ? authResult.value : null;

          if (userResult.status === "rejected") {
            console.error("[AUTH ERROR]: Failed to fetch /users doc:", userResult.reason);
          }
          if (authResult.status === "rejected") {
            console.error("[AUTH ERROR]: Failed to fetch /authorizedEmails doc:", authResult.reason);
          }

          // 2. Extract permissions safely
          let resolvedRole: Role = "student";
          let resolvedPermissions: FeatureKey[] = rolePresets.student;
          let resolvedStatus: "active" | "disabled" = "active";

          if (authDocSnap && authDocSnap.exists()) {
            const authData = authDocSnap.data() as any;
            resolvedRole = (authData.role as Role) || "student";
            resolvedStatus = (authData.status as "active" | "disabled") || "active";
            // Prioritize custom permissions from authorizedEmails, fallback to role preset
            resolvedPermissions =
              Array.isArray(authData.permissions) && authData.permissions.length > 0
                ? (authData.permissions as FeatureKey[])
                : rolePresets[resolvedRole] || rolePresets.student;
          } else if (userDocSnap && userDocSnap.exists()) {
            const userData = userDocSnap.data() as any;
            resolvedRole = (userData.role as Role) || "student";
            resolvedStatus = (userData.status as "active" | "disabled") || "active";
            resolvedPermissions =
              Array.isArray(userData.permissions) && userData.permissions.length > 0
                ? (userData.permissions as FeatureKey[])
                : rolePresets[resolvedRole] || rolePresets.student;
          } else if (ADMIN_EMAIL && normalizedEmail === ADMIN_EMAIL) {
            resolvedRole = "admin";
            resolvedPermissions = rolePresets.admin;
          } else {
            // Not authorized
            await firebaseSignOut(auth);
            setCurrentUser(null);
            window.localStorage.removeItem(SESSION_KEY);
            toast.error("Email not authorized. Please contact the administrator.");
            setAuthReady(true);
            return;
          }

          if (resolvedStatus === "disabled") {
            console.warn("[ACCESS] User account is disabled:", normalizedEmail);
            toast.error("Your account has been disabled. Please contact the administrator.");
            await firebaseSignOut(auth);
            setCurrentUser(null);
            window.localStorage.removeItem(SESSION_KEY);
            setAuthReady(true);
            return;
          }

          const name = firebaseUser.displayName || normalizedEmail.split("@")[0] || "User";
          const photoURL = firebaseUser.photoURL || null;

          // 3. Update/Merge the user's document in /users/{firebaseUser.uid}
          await setDoc(
            userDocRef,
            {
              uid: firebaseUser.uid,
              email: normalizedEmail,
              name,
              photoURL,
              role: resolvedRole,
              permissions: resolvedPermissions,
              status: resolvedStatus,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          // 4. Update currentUser state
          setCurrentUser({
            uid: firebaseUser.uid,
            email: normalizedEmail,
            name,
            photoURL,
            role: resolvedRole,
            status: resolvedStatus,
            permissions: resolvedPermissions,
          });
          window.localStorage.setItem(SESSION_KEY, normalizedEmail);
        } catch (err: any) {
          console.error("[AUTH ERROR]:", err);
          toast.error("Authentication error. Please contact the administrator.");
          await firebaseSignOut(auth);
          setCurrentUser(null);
          window.localStorage.removeItem(SESSION_KEY);
        }
      } else {
        // User signed out or no email
        setCurrentUser(null);
        window.localStorage.removeItem(SESSION_KEY);
      }

      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Listen to /users/{uid} document changes for real-time role/status/permissions updates
  useEffect(() => {
    if (!currentUser?.uid) {
      return;
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data() as any;

          console.log("[ACCESS] /users document updated:", {
            uid: currentUser.uid,
            role: userData.role,
            status: userData.status,
            permissionsCount: Array.isArray(userData.permissions) ? userData.permissions.length : undefined,
          });

          const updatedRole = (userData.role as Role) || currentUser.role;
          const updatedStatus = (userData.status as "active" | "invited" | "disabled") || currentUser.status;
          const updatedPermissions: FeatureKey[] = Array.isArray(userData.permissions)
            ? (userData.permissions as FeatureKey[])
            : rolePresets[updatedRole] || [];
          const updatedPhotoURL = userData.photoURL ?? auth.currentUser?.photoURL ?? currentUser.photoURL ?? null;

          setCurrentUser((prev) =>
            prev
              ? {
                  ...prev,
                  name: userData.name || prev.name,
                  photoURL: updatedPhotoURL,
                  role: updatedRole,
                  status: updatedStatus,
                  permissions: updatedPermissions,
                }
              : null
          );
        } else {
          // User document deleted - sign out
          console.warn("[ACCESS] /users document deleted, signing out");
          firebaseSignOut(auth);
          setCurrentUser(null);
          window.localStorage.removeItem(SESSION_KEY);
        }
      },
      (error) => {
        console.error("[ACCESS] Error listening to user document:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    window.localStorage.removeItem(SESSION_KEY);
  }, []);

  const can = useCallback<AccessState["can"]>(
    (key) =>
      !!currentUser && currentUser.status !== "disabled" && currentUser.permissions.includes(key),
    [currentUser],
  );

  const signInWithGoogle = useCallback<AccessState["signInWithGoogle"]>(async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    provider.setCustomParameters({
      prompt: "select_account",
    });

    try {
      const result = await signInWithPopup(auth, provider);
      if (!result.user || !result.user.email) {
        return { ok: false, reason: "No email returned from Google" };
      }
      return { ok: true };
    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user") {
        console.warn("[ACCESS] Google sign-in cancelled by user");
        return { ok: false, reason: "signin-cancelled" };
      }
      console.error("[ACCESS] Google sign-in error:", error);
      return { ok: false, reason: error.message || "Failed to sign in with Google" };
    }
  }, []);

  const value = useMemo<AccessState>(
    () => ({
      currentUser,
      authReady,
      signInWithGoogle,
      signOut,
      can,
    }),
    [currentUser, authReady, signInWithGoogle, signOut, can],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used inside AccessProvider");
  return ctx;
}
