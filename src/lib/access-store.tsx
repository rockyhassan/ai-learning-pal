import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

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
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "invited" | "disabled";
  permissions: FeatureKey[];
  pin: string;
};

const seedUsers: AccessUser[] = [];

type AccessState = {
  users: AccessUser[];
  currentUser: AccessUser | null;
  authReady: boolean;
  signIn: (email: string, pin: string) => { ok: boolean; reason?: "not-found" | "disabled" | "invalid-pin" };
  signOut: () => void;
  signInAsAdmin: () => Promise<{ ok: boolean; reason?: string }>;
  can: (key: FeatureKey) => boolean;
  invite: (input: { name: string; email: string; role: Role }) => void;
  togglePermission: (userId: string, key: FeatureKey) => void;
  setRole: (userId: string, role: Role) => void;
  toggleStatus: (userId: string) => void;
  remove: (userId: string) => void;
  changePIN: (userId: string, newPin: string) => void;
  resetPIN: (userId: string) => string;
};

const AccessContext = createContext<AccessState | null>(null);

const SESSION_KEY = "wafi.session.email";
const USERS_KEY = "wafi.users-access";

/** Generate a random 4-digit numeric PIN */
function generatePIN(): string {
  return Math.floor(1000 + Math.random() * 8000).toString();
}

export function AccessProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AccessUser[]>(seedUsers);
  const [email, setEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const adminEmail = import.meta.env['VITE_FIREBASE_ADMIN_EMAIL'] || '';

  // DIAGNOSTIC: Log seedUsers on initialization
  console.log("[DIAG] AccessProvider initialized with seedUsers:", {
    length: seedUsers.length,
    users: seedUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
    })),
  });

  // Listen for Firebase auth state changes (for admin login)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("[DIAG] onAuthStateChanged fired:", {
        hasUser: !!firebaseUser,
        firebaseUserEmail: firebaseUser?.email,
        firebaseUserUid: firebaseUser?.uid,
        adminEmail: adminEmail ? `${adminEmail.substring(0, 3)}***@gmail.com` : "NOT SET",
        emailMatch: firebaseUser?.email?.toLowerCase() === adminEmail.toLowerCase(),
      });
      
      if (firebaseUser && firebaseUser.email?.toLowerCase() === adminEmail.toLowerCase()) {
        console.log("[DIAG] onAuthStateChanged: Email MATCHES admin");
        // Firebase user is authenticated as the admin
        // Check if admin user exists in users list, if not create it
        setUsers((prev) => {
          const adminExists = prev.some((u) => u.role === "admin" && u.email.toLowerCase() === adminEmail.toLowerCase());
          console.log("[DIAG] onAuthStateChanged: adminExists =", adminExists);
          if (!adminExists) {
            console.log("[DIAG] onAuthStateChanged: Adding admin user to users array");
            return [
              ...prev,
              {
                id: "u-firebase-admin",
                name: firebaseUser.displayName || "Admin",
                email: firebaseUser.email,
                role: "admin",
                status: "active",
                permissions: rolePresets.admin,
                pin: "", // No PIN needed for Firebase auth
              },
            ];
          }
          return prev;
        });
        // Set the authenticated email as current session
        console.log("[DIAG] onAuthStateChanged: Setting email =", firebaseUser.email);
        window.localStorage.setItem(SESSION_KEY, firebaseUser.email);
        setEmail(firebaseUser.email);
      } else {
        console.log("[DIAG] onAuthStateChanged: Email does NOT match admin");
      }
    });

    return () => unsubscribe();
  }, [adminEmail]);



  // Load persisted users from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      console.log("[DIAG] Loading localStorage wafi.users-access:", {
        keyExists: raw !== null,
        rawLength: raw?.length,
      });
      
      if (raw) {
        const parsed = JSON.parse(raw) as AccessUser[];
        console.log("[DIAG] Parsed localStorage users:", {
          parsedLength: parsed.length,
          parentUsers: parsed
            .filter(u => u.role === "parent")
            .map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status })),
          studentUsers: parsed
            .filter(u => u.role === "student")
            .map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status })),
          teacherUsers: parsed
            .filter(u => u.role === "teacher")
            .map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status })),
        });
        
        // Validate that all required fields exist; fallback to seed if invalid
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure all users have a PIN field; if missing, use seed user's PIN
          const validatedUsers = parsed.map((u) => {
            const seedUser = seedUsers.find((su) => su.id === u.id);
            return {
              ...u,
              pin: u.pin ?? seedUser?.pin ?? "",
            };
          });
          console.log("[DIAG] After validation, setUsers called with", validatedUsers.length, "users");
          setUsers(validatedUsers);
        }
      }
    } catch (e) {
      console.log("[DIAG] localStorage load error:", e);
    }
  }, []);

  // Persist users to localStorage whenever they change
  useEffect(() => {
    try {
      console.log("[DIAG] setUsers effect: persisting", users.length, "users to localStorage");
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch {
      /* ignore */
    }
  }, [users]);

  // Load persisted session email
  useEffect(() => {
    const storedEmail = window.localStorage.getItem(SESSION_KEY);
    console.log("[DIAG] Session load effect: storedEmail from localStorage =", storedEmail);
    setEmail(storedEmail);
    setAuthReady(true);
    console.log("[DIAG] Session load effect: setAuthReady(true)");
  }, []);

  const currentUser = useMemo(
    () => {
      const user = users.find((u) => u.email.toLowerCase() === (email ?? "").toLowerCase()) ?? null;
      console.log("[DIAG] currentUser useMemo updated:", {
        email,
        foundUser: user ? { id: user.id, email: user.email, role: user.role } : null,
      });
      return user;
    },
    [users, email],
  );

  const signIn = useCallback<AccessState["signIn"]>(
    (input, inputPin) => {
      const found = users.find((u) => u.email.toLowerCase() === input.trim().toLowerCase());
      if (!found) return { ok: false, reason: "not-found" as const };
      if (found.status === "disabled") return { ok: false, reason: "disabled" as const };
      if (found.pin !== inputPin) return { ok: false, reason: "invalid-pin" as const };
      window.localStorage.setItem(SESSION_KEY, found.email);
      setEmail(found.email);
      return { ok: true };
    },
    [users],
  );

  const signOut = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    setEmail(null);
  }, []);

  const can = useCallback<AccessState["can"]>(
    (key) =>
      !!currentUser && currentUser.status !== "disabled" && currentUser.permissions.includes(key),
    [currentUser],
  );

  const invite = useCallback<AccessState["invite"]>(({ name, email, role }) => {
    setUsers((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        name: name || email.split("@")[0] || email,
        email,
        role,
        status: "active",
        permissions: rolePresets[role],
        pin: generatePIN(),
      },
    ]);
  }, []);

  const togglePermission = useCallback<AccessState["togglePermission"]>((userId, key) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              permissions: u.permissions.includes(key)
                ? u.permissions.filter((p) => p !== key)
                : [...u.permissions, key],
            }
          : u,
      ),
    );
  }, []);

  const setRole = useCallback<AccessState["setRole"]>((userId, role) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role, permissions: rolePresets[role] } : u)),
    );
  }, []);

  const toggleStatus = useCallback<AccessState["toggleStatus"]>((userId) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, status: u.status === "disabled" ? "active" : "disabled" } : u,
      ),
    );
  }, []);

  const remove = useCallback<AccessState["remove"]>((userId) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const changePIN = useCallback<AccessState["changePIN"]>((userId, newPin) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, pin: newPin } : u)),
    );
  }, []);

  const resetPIN = useCallback<AccessState["resetPIN"]>((userId) => {
    const newPin = generatePIN();
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, pin: newPin } : u)),
    );
    return newPin;
  }, []);

  const signInAsAdmin = useCallback<AccessState["signInAsAdmin"]>(async () => {
    if (!adminEmail) {
      return { ok: false, reason: "Admin email not configured. Set VITE_FIREBASE_ADMIN_EMAIL environment variable." };
    }

    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    provider.setCustomParameters({
      prompt: "select_account",
    });

    try {
      const result = await signInWithPopup(auth, provider);

      // Verify the Google account email matches configured admin email
      if (result.user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
        // Sign out the non-admin account
        await firebaseSignOut(auth);
        return { ok: false, reason: `Only ${adminEmail} can authenticate as admin. You signed in with ${result.user.email}` };
      }

      // Email matches admin - set session to trigger currentUser update
      // onAuthStateChanged will also fire and create the admin user in the users list
      window.localStorage.setItem(SESSION_KEY, result.user.email);
      setEmail(result.user.email);
      return { ok: true };
    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user") {
        return { ok: false, reason: "Google Sign-In was cancelled" };
      }
      return { ok: false, reason: error.message || "Failed to initiate Google Sign-In" };
    }
  }, [adminEmail]);

  const value = useMemo<AccessState>(
    () => ({
      users,
      currentUser,
      authReady,
      signIn,
      signOut,
      signInAsAdmin,
      can,
      invite,
      togglePermission,
      setRole,
      toggleStatus,
      remove,
      changePIN,
      resetPIN,
    }),
    [
      users,
      currentUser,
      authReady,
      signIn,
      signOut,
      signInAsAdmin,
      can,
      invite,
      togglePermission,
      setRole,
      toggleStatus,
      remove,
      changePIN,
      resetPIN,
    ],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used inside AccessProvider");
  return ctx;
}