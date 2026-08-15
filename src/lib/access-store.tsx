import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
};

const seedUsers: AccessUser[] = [
  {
    id: "u-admin",
    name: "Rakib Hassan",
    email: "rakib@wafi.app",
    role: "admin",
    status: "active",
    permissions: rolePresets.admin,
  },
  {
    id: "u-parent",
    name: "Shirin Rahman",
    email: "shirin.parent@gmail.com",
    role: "parent",
    status: "active",
    permissions: rolePresets.parent,
  },
  {
    id: "u-student",
    name: "Wafi Rahman",
    email: "wafi.student@gmail.com",
    role: "student",
    status: "active",
    permissions: rolePresets.student,
  },
  {
    id: "u-teacher",
    name: "Ms. Nabila Haque",
    email: "nabila.teacher@sunrise.edu.bd",
    role: "teacher",
    status: "active",
    permissions: rolePresets.teacher,
  },
  {
    id: "u-teacher-2",
    name: "Mr. Rafiqul Islam",
    email: "rafiq.math@sunrise.edu.bd",
    role: "teacher",
    status: "invited",
    permissions: rolePresets.teacher,
  },
];

type AccessState = {
  users: AccessUser[];
  currentUser: AccessUser | null;
  authReady: boolean;
  signIn: (email: string) => { ok: boolean; reason?: "not-found" | "disabled" };
  signOut: () => void;
  can: (key: FeatureKey) => boolean;
  invite: (input: { name: string; email: string; role: Role }) => void;
  togglePermission: (userId: string, key: FeatureKey) => void;
  setRole: (userId: string, role: Role) => void;
  toggleStatus: (userId: string) => void;
  remove: (userId: string) => void;
};

const AccessContext = createContext<AccessState | null>(null);

const SESSION_KEY = "wafi.session.email";

export function AccessProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AccessUser[]>(seedUsers);
  const [email, setEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    setEmail(window.localStorage.getItem(SESSION_KEY));
    setAuthReady(true);
  }, []);

  const currentUser = useMemo(
    () => users.find((u) => u.email.toLowerCase() === (email ?? "").toLowerCase()) ?? null,
    [users, email],
  );

  const signIn = useCallback<AccessState["signIn"]>(
    (input) => {
      const found = users.find((u) => u.email.toLowerCase() === input.trim().toLowerCase());
      if (!found) return { ok: false, reason: "not-found" as const };
      if (found.status === "disabled") return { ok: false, reason: "disabled" as const };
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
        status: "invited",
        permissions: rolePresets[role],
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

  const value = useMemo<AccessState>(
    () => ({
      users,
      currentUser,
      authReady,
      signIn,
      signOut,
      can,
      invite,
      togglePermission,
      setRole,
      toggleStatus,
      remove,
    }),
    [
      users,
      currentUser,
      authReady,
      signIn,
      signOut,
      can,
      invite,
      togglePermission,
      setRole,
      toggleStatus,
      remove,
    ],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used inside AccessProvider");
  return ctx;
}