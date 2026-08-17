import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { db, auth } from "./firebase";
import { useAccess } from "./access-store";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";

export type DiaryEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  subject: string;
  cw: string;
  hw: string;
  answer: string;
  // Advanced homework fields
  teacherAnswer?: string;
  easyAnswer?: string;
  banglaExplanation?: string;
  pronunciation?: string[]; // comma-separated words
  wordMeanings?: Array<{ word: string; meaning: string }>;
  practice?: {
    question: string;
    options: string[];
  };
};

export type RoutineEntry = {
  id: string;
  day: Weekday;
  start: string;
  end: string;
  subject: string;
  teacher: string;
};

export type ExamEntry = {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  chapter: string;
  description?: string;
};

export type Weekday = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export const weekdays: { key: Weekday; en: string; bn: string }[] = [
  { key: "Sun", en: "Sun", bn: "রবি" },
  { key: "Mon", en: "Mon", bn: "সোম" },
  { key: "Tue", en: "Tue", bn: "মঙ্গল" },
  { key: "Wed", en: "Wed", bn: "বুধ" },
  { key: "Thu", en: "Thu", bn: "বৃহঃ" },
  { key: "Fri", en: "Fri", bn: "শুক্র" },
  { key: "Sat", en: "Sat", bn: "শনি" },
];

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayWeekday(): Weekday {
  return (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as Weekday[])[new Date().getDay()];
}

/** Format a date string (YYYY-MM-DD) as "Today", "Yesterday", or full formatted date with day of week. */
export function formatDiaryDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const displayDate = new Date(year, month - 1, day);

    // Get today's date in local timezone
    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Get yesterday's date in local timezone
    const yesterday = new Date(todayLocal);
    yesterday.setDate(yesterday.getDate() - 1);

    // Compare dates
    if (displayDate.getTime() === todayLocal.getTime()) {
      return "Today";
    }
    if (displayDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    }

    // For other dates, show full formatted date
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const dayName = dayNames[displayDate.getDay()];
    const monthName = monthNames[displayDate.getMonth()];
    return `${day} ${monthName} ${year} · ${dayName}`;
  } catch {
    return dateStr;
  }
}

/**
 * Calculate days remaining from today until the exam date.
 * Returns positive number if future, 0 if today, negative if passed.
 */
export function calculateDaysRemaining(examDate: string): number {
  try {
    const [year, month, day] = examDate.split("-").map(Number);
    const exam = new Date(year, month - 1, day);
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = exam.getTime() - todayDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch {
    return 0;
  }
}

/**
 * Format days remaining for display.
 * Examples: "Today", "11 days left"
 */
export function formatDaysRemaining(days: number): string {
  if (days === 0) return "Today";
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `${days} days left`;
}

/**
 * Determine if a date is "today", "yesterday", or "older".
 * Used to control default expanded/collapsed state in dashboard.
 */
export function getDateCategory(dateStr: string): "today" | "yesterday" | "older" {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const displayDate = new Date(year, month - 1, day);

    // Get today's date in local timezone
    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Get yesterday's date in local timezone
    const yesterday = new Date(todayLocal);
    yesterday.setDate(yesterday.getDate() - 1);

    if (displayDate.getTime() === todayLocal.getTime()) {
      return "today";
    }
    if (displayDate.getTime() === yesterday.getTime()) {
      return "yesterday";
    }
    return "older";
  } catch {
    return "older";
  }
}

const seedDiary: DiaryEntry[] = [
  {
    id: "d-1",
    date: todayKey(),
    subject: "English Language",
    cw: "Grammar Builder 1 Unit 5.1, pg- 45, Ex- E done in the class.",
    hw: "N/A",
    answer: "",
  },
  {
    id: "d-2",
    date: todayKey(),
    subject: "Maths",
    cw: "Helium- Success book. Ex- 2.5. Pg- 26 / Neon- ICT class taken",
    hw: "Helium- Success book. Ex- 2.5. Pg- 26 (5,6)",
    answer: "",
  },
  {
    id: "d-3",
    date: todayKey(),
    subject: "Computer Science",
    cw: "Chapter-1, book page: 8-9, exercises done.",
    hw: "Practice them at home again.",
    answer: "",
  },
  {
    id: "d-4",
    date: todayKey(),
    subject: "Science",
    cw: "SS chapter: 1,2 Question-Answer and F/B was done.",
    hw: "Revise previous topics.",
    answer: "",
  },
  {
    id: "d-5",
    date: todayKey(),
    subject: "Bangla 2nd Paper",
    cw: "ধ্বনি ও ধ্বনির প্রকারভেদ অনুশীলনীর প্রশ্নের উত্তর লিখানো হয়েছে।",
    hw: "বাড়িতে অনুশীলন করবে।",
    answer: "",
  },
];

const seedRoutine: RoutineEntry[] = [
  {
    id: "r-1",
    day: "Sun",
    start: "08:00",
    end: "08:10",
    subject: "National Anthem & Surah Fatiha",
    teacher: "",
  },
  {
    id: "r-2",
    day: "Sun",
    start: "08:10",
    end: "08:45",
    subject: "English Literature",
    teacher: "Jabed Ahmed",
  },
  { id: "r-3", day: "Sun", start: "08:45", end: "09:20", subject: "English Language", teacher: "" },
  { id: "r-4", day: "Sun", start: "09:20", end: "09:35", subject: "Snacks Break", teacher: "" },
  {
    id: "r-5",
    day: "Sun",
    start: "09:35",
    end: "10:05",
    subject: "Physical Education & Sports",
    teacher: "",
  },
  {
    id: "r-6",
    day: "Sun",
    start: "10:05",
    end: "10:40",
    subject: "English Literature",
    teacher: "",
  },
  { id: "r-7", day: "Sun", start: "10:40", end: "11:15", subject: "Geography", teacher: "" },
  {
    id: "r-8",
    day: "Mon",
    start: "08:00",
    end: "08:10",
    subject: "National Anthem & Surah Fatiha",
    teacher: "",
  },
  {
    id: "r-9",
    day: "Mon",
    start: "08:10",
    end: "08:45",
    subject: "Maths",
    teacher: "Rafiqul Islam",
  },
  {
    id: "r-10",
    day: "Mon",
    start: "08:45",
    end: "09:20",
    subject: "Science",
    teacher: "Tania Akter",
  },
];

// Calculate exam dates for seed data: 3 days, 11 days, 18 days from today
function getExamDateFromDaysOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const seedExams: ExamEntry[] = [
  {
    id: "ex-1",
    name: "Math Class Test",
    date: getExamDateFromDaysOffset(3),
    chapter: "Chapter 3: Fractions",
  },
  {
    id: "ex-2",
    name: "English Mid Term",
    date: getExamDateFromDaysOffset(11),
    chapter: "Chapter 1-3",
  },
  {
    id: "ex-3",
    name: "Science Quiz",
    date: getExamDateFromDaysOffset(18),
    chapter: "Living Things",
  },
];

/**
 * Recognize C.W and H.W field labels (case-insensitive):
 * - "C.W", "C.W:", "C.W (Class Work)", "Class Work"
 * - "H.W", "H.W:", "H.W (Home Work)", "Home Work"
 */
function getFieldLabel(line: string): "cw" | "hw" | null {
  const normalized = line.trim().toLowerCase();

  // Check for C.W variants (C.W, C.W:, C.W -, C.W (Class Work), etc.)
  if (/^c\.w(\s|:|$|-|\()/i.test(normalized) || /^class\s+work/i.test(normalized)) {
    return "cw";
  }

  // Check for H.W variants (H.W, H.W:, H.W -, H.W (Home Work), etc.)
  if (/^h\.w(\s|:|$|-|\()/i.test(normalized) || /^home\s+work/i.test(normalized)) {
    return "hw";
  }

  return null;
}

/**
 * Extract the content after a field label.
 * "C.W: content" → "content"
 * "C.W (Class Work) - content" → "content"
 * "Class Work content" → "content"
 */
function extractFieldContent(line: string, label: "cw" | "hw"): string {
  const trimmed = line.trim();

  // For C.W variants
  if (/^c\.w/i.test(trimmed)) {
    // Remove "C.W", "C.W:", "C.W -", "C.W (Class Work)", "C.W (Class Work) -", etc.
    return trimmed.replace(/^c\.w\s*[:\-]?\s*(\([^)]*\)\s*[:\-]?\s*)?/i, "").trim();
  }

  if (/^class\s+work/i.test(trimmed)) {
    // Remove "Class Work", "Class Work:", "Class Work -", etc.
    return trimmed.replace(/^class\s+work\s*[:\-]?\s*/i, "").trim();
  }

  // For H.W variants
  if (/^h\.w/i.test(trimmed)) {
    // Remove "H.W", "H.W:", "H.W -", "H.W (Home Work)", "H.W (Home Work) -", etc.
    return trimmed.replace(/^h\.w\s*[:\-]?\s*(\([^)]*\)\s*[:\-]?\s*)?/i, "").trim();
  }

  if (/^home\s+work/i.test(trimmed)) {
    // Remove "Home Work", "Home Work:", "Home Work -", etc.
    return trimmed.replace(/^home\s+work\s*[:\-]?\s*/i, "").trim();
  }

  return trimmed;
}

/** Parse pasted school-diary text into entries. Supports "Subject | C.W | H.W", single-line subjects, and multi-line subjects with C.W/H.W field labels. */
export function parseDiaryText(text: string, date: string): Omit<DiaryEntry, "id">[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const entries: Omit<DiaryEntry, "id">[] = [];
  let currentEntry: Omit<DiaryEntry, "id"> | null = null;

  for (const line of lines) {
    const fieldLabel = getFieldLabel(line);

    if (fieldLabel === "cw" || fieldLabel === "hw") {
      // This is a field label line (C.W or H.W)
      if (!currentEntry) {
        // No active subject; create a default one
        currentEntry = { date, subject: "General", cw: "", hw: "", answer: "" };
      }

      // Extract content and populate the appropriate field
      const content = extractFieldContent(line, fieldLabel);
      if (fieldLabel === "cw") {
        currentEntry.cw = content;
      } else {
        currentEntry.hw = content;
      }
    } else {
      // This is a subject line (or delimiter-based single-line entry)

      // First, save the current entry if it exists
      if (currentEntry && (currentEntry.subject || currentEntry.cw || currentEntry.hw)) {
        entries.push(currentEntry);
      }

      // Try to parse this as a single-line entry with delimiters
      let parts: string[] = [];
      if (line.includes("|")) {
        parts = line.split("|");
      } else if (line.includes("\t")) {
        parts = line.split("\t");
      } else if (line.includes(":") && !line.toLowerCase().startsWith("http")) {
        // Avoid splitting URLs
        const idx = line.indexOf(":");
        parts = [line.slice(0, idx), line.slice(idx + 1)];
      } else {
        // Just a subject line, no delimiters
        parts = [line];
      }

      const [subject = "", cw = "", hw = "", answer = ""] = parts.map((p) => p.trim());

      // Start a new entry
      currentEntry = {
        date,
        subject: subject || "General",
        cw,
        hw,
        answer,
      };
    }
  }

  // Don't forget the last entry
  if (currentEntry && (currentEntry.subject || currentEntry.cw || currentEntry.hw)) {
    entries.push(currentEntry);
  }

  return entries;
}

type Ctx = {
  diary: DiaryEntry[];
  routine: RoutineEntry[];
  exams: ExamEntry[];
  addDiary: (e: Omit<DiaryEntry, "id">) => void;
  addDiaryMany: (list: Omit<DiaryEntry, "id">[]) => void;
  updateDiary: (id: string, patch: Partial<DiaryEntry>) => void;
  removeDiary: (id: string) => void;
  addRoutine: (e: Omit<RoutineEntry, "id">) => void;
  updateRoutine: (id: string, patch: Partial<RoutineEntry>) => void;
  removeRoutine: (id: string) => void;
  addExam: (e: Omit<ExamEntry, "id">) => void;
  updateExam: (id: string, patch: Partial<ExamEntry>) => void;
  removeExam: (id: string) => void;
};

const SchoolContentContext = createContext<Ctx | null>(null);
const KEY = "wafi.school-content";
const uid = () => Math.random().toString(36).slice(2, 10);

export function SchoolContentProvider({ children }: { children: ReactNode }) {
  const [diary, setDiary] = useState<DiaryEntry[]>(seedDiary);
  const [routine, setRoutine] = useState<RoutineEntry[]>(seedRoutine);
  const [exams, setExams] = useState<ExamEntry[]>(seedExams);
  const [firestoreReady, setFirestoreReady] = useState(false);
  const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);
  const [isAdminAuthenticatedWithFirebase, setIsAdminAuthenticatedWithFirebase] = useState(false);
  const { currentUser } = useAccess();
  const isAdmin = currentUser?.role === "admin";

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          diary?: DiaryEntry[];
          routine?: RoutineEntry[];
          exams?: ExamEntry[];
        };
        if (parsed.diary) setDiary(parsed.diary);
        if (parsed.routine) setRoutine(parsed.routine);
        if (parsed.exams) setExams(parsed.exams);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist to localStorage whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ diary, routine, exams }));
    } catch {
      /* ignore */
    }
  }, [diary, routine, exams]);

  // Check Firebase authentication status for admin
  useEffect(() => {
    if (!isAdmin) {
      setFirebaseAuthReady(true);
      setIsAdminAuthenticatedWithFirebase(false);
      return;
    }

    // Listen to Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const adminEmail = import.meta.env["VITE_FIREBASE_ADMIN_EMAIL"] || "";
      const isAuthed =
        firebaseUser && firebaseUser.email?.toLowerCase() === adminEmail.toLowerCase();
      setIsAdminAuthenticatedWithFirebase(isAuthed);
      setFirebaseAuthReady(true);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Set up Firestore listener for diary (read-only for non-admin, read+write for admin)
  useEffect(() => {
    try {
      const diaryCollection = collection(db, "diary");
      const q = query(diaryCollection);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const remoteDiary = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as DiaryEntry[];

          // Merge: prioritize Firestore data, fallback to localStorage
          setDiary((localDiary) => {
            const diaryMap = new Map(localDiary.map((d) => [d.id, d]));

            remoteDiary.forEach((remote) => {
              diaryMap.set(remote.id, remote);
            });

            return Array.from(diaryMap.values());
          });

          setFirestoreReady(true);
        },
        (error) => {
          console.warn("Firestore diary listener error:", error);
          setFirestoreReady(true); // Continue with localStorage
        },
      );

      return unsubscribe;
    } catch (error) {
      console.warn("Firestore diary setup error:", error);
      setFirestoreReady(true); // Continue with localStorage
      return () => {};
    }
  }, []);
  const addDiary = useCallback(
    (e: Omit<DiaryEntry, "id">) => {
      const newId = uid();
      const entry: DiaryEntry = { ...e, id: newId };

      // Always update local state
      setDiary((p) => [entry, ...p]);

      // If admin with Firebase auth and Firestore ready, sync to Firestore
      if (isAdmin && isAdminAuthenticatedWithFirebase && firestoreReady) {
        setDoc(doc(db, "diary", newId), entry).catch((error) => {
          console.error("Firestore addDiary error:", error);
        });
      }
    },
    [isAdmin, isAdminAuthenticatedWithFirebase, firestoreReady],
  );

  const addDiaryMany = useCallback(
    (list: Omit<DiaryEntry, "id">[]) => {
      const entries: DiaryEntry[] = list.map((e) => ({ ...e, id: uid() }));
      setDiary((p) => [...entries, ...p]);

      // If admin with Firebase auth and Firestore ready, batch write to Firestore
      if (isAdmin && isAdminAuthenticatedWithFirebase && firestoreReady) {
        const batch = writeBatch(db);
        entries.forEach((entry) => {
          batch.set(doc(db, "diary", entry.id), entry);
        });
        batch.commit().catch((error) => {
          console.error("Firestore addDiaryMany error:", error);
        });
      }
    },
    [isAdmin, isAdminAuthenticatedWithFirebase, firestoreReady],
  );

  const updateDiary = useCallback(
    (id: string, patch: Partial<DiaryEntry>) => {
      setDiary((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));

      // If admin with Firebase auth and Firestore ready, sync update to Firestore
      if (isAdmin && isAdminAuthenticatedWithFirebase && firestoreReady) {
        setDoc(doc(db, "diary", id), patch, { merge: true }).catch((error) => {
          console.error("Firestore updateDiary error:", error);
        });
      }
    },
    [isAdmin, isAdminAuthenticatedWithFirebase, firestoreReady],
  );

  const removeDiary = useCallback(
    (id: string) => {
      setDiary((p) => p.filter((e) => e.id !== id));

      // If admin with Firebase auth and Firestore ready, delete from Firestore
      if (isAdmin && isAdminAuthenticatedWithFirebase && firestoreReady) {
        deleteDoc(doc(db, "diary", id)).catch((error) => {
          console.error("Firestore removeDiary error:", error);
        });
      }
    },
    [isAdmin, isAdminAuthenticatedWithFirebase, firestoreReady],
  );

  // Set up Firestore listener for exams
  useEffect(() => {
    try {
      const examsCollection = collection(db, "exams");
      const q = query(examsCollection);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const remoteExams = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as ExamEntry[];

          // Merge: prioritize Firestore data, fallback to localStorage
          setExams((localExams) => {
            const examsMap = new Map(localExams.map((e) => [e.id, e]));

            remoteExams.forEach((remote) => {
              examsMap.set(remote.id, remote);
            });

            return Array.from(examsMap.values());
          });
        },
        (error) => {
          console.warn("Firestore exams listener error:", error);
        },
      );

      return unsubscribe;
    } catch (error) {
      console.warn("Firestore exams setup error:", error);
      return () => {};
    }
  }, []);

  // Firestore sync for addExam
  const addExam = useCallback(
    (e: Omit<ExamEntry, "id">) => {
      const newId = uid();
      const entry: ExamEntry = { ...e, id: newId };

      // Always update local state
      setExams((p) => [entry, ...p]);

      // If admin with Firebase auth and Firestore ready, sync to Firestore
      if (isAdmin && isAdminAuthenticatedWithFirebase && firestoreReady) {
        setDoc(doc(db, "exams", newId), entry).catch((error) => {
          console.error("Firestore addExam error:", error);
        });
      }
    },
    [isAdmin, isAdminAuthenticatedWithFirebase, firestoreReady],
  );

  const updateExam = useCallback(
    (id: string, patch: Partial<ExamEntry>) => {
      setExams((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));

      // If admin with Firebase auth and Firestore ready, sync update to Firestore
      if (isAdmin && isAdminAuthenticatedWithFirebase && firestoreReady) {
        setDoc(doc(db, "exams", id), patch, { merge: true }).catch((error) => {
          console.error("Firestore updateExam error:", error);
        });
      }
    },
    [isAdmin, isAdminAuthenticatedWithFirebase, firestoreReady],
  );

  const removeExam = useCallback(
    (id: string) => {
      setExams((p) => p.filter((e) => e.id !== id));

      // If admin with Firebase auth and Firestore ready, delete from Firestore
      if (isAdmin && isAdminAuthenticatedWithFirebase && firestoreReady) {
        deleteDoc(doc(db, "exams", id)).catch((error) => {
          console.error("Firestore removeExam error:", error);
        });
      }
    },
    [isAdmin, isAdminAuthenticatedWithFirebase, firestoreReady],
  );

  const addRoutine = useCallback((e: Omit<RoutineEntry, "id">) => {
    setRoutine((p) => [...p, { ...e, id: uid() }]);
  }, []);

  const updateRoutine = useCallback((id: string, patch: Partial<RoutineEntry>) => {
    setRoutine((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const removeRoutine = useCallback((id: string) => {
    setRoutine((p) => p.filter((e) => e.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      diary,
      routine,
      exams,
      addDiary,
      addDiaryMany,
      updateDiary,
      removeDiary,
      addRoutine,
      updateRoutine,
      removeRoutine,
      addExam,
      updateExam,
      removeExam,
    }),
    [
      diary,
      routine,
      exams,
      addDiary,
      addDiaryMany,
      updateDiary,
      removeDiary,
      addRoutine,
      updateRoutine,
      removeRoutine,
      addExam,
      updateExam,
      removeExam,
    ],
  );

  return <SchoolContentContext.Provider value={value}>{children}</SchoolContentContext.Provider>;
}

export function useSchoolContent() {
  const ctx = useContext(SchoolContentContext);
  if (!ctx) throw new Error("useSchoolContent must be used inside SchoolContentProvider");
  return ctx;
}

export function sortRoutine(list: RoutineEntry[]) {
  return [...list].sort((a, b) => {
    // Handle undefined start times safely
    if (!a.start && !b.start) return 0;
    if (!a.start) return 1; // Entries without start sort to end
    if (!b.start) return -1;
    // Both have start times: sort ascending
    return a.start.localeCompare(b.start);
  });
}

/** Get unique subjects from diary entries, sorted alphabetically. */
export function getUniqueDiarySubjects(diary: DiaryEntry[]): string[] {
  const subjects = new Set<string>();

  for (const entry of diary) {
    if (entry.subject && entry.subject.trim()) {
      subjects.add(entry.subject.trim());
    }
  }

  return Array.from(subjects).sort();
}

/** Get all diary entries for a subject, sorted by date (newest first). */
export function filterDiaryBySubject(diary: DiaryEntry[], subject: string): DiaryEntry[] {
  return diary
    .filter((entry) => entry.subject.trim() === subject.trim())
    .sort((a, b) => {
      // Handle undefined dates
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      // Both have dates: sort descending (newest first)
      return b.date.localeCompare(a.date);
    });
}
