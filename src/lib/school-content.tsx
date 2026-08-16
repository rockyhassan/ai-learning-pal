import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DiaryEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  subject: string;
  cw: string;
  hw: string;
  answer: string;
};

export type RoutineEntry = {
  id: string;
  day: Weekday;
  start: string;
  end: string;
  subject: string;
  teacher: string;
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
  { id: "r-1", day: "Sun", start: "08:00", end: "08:10", subject: "National Anthem & Surah Fatiha", teacher: "" },
  { id: "r-2", day: "Sun", start: "08:10", end: "08:45", subject: "English Literature", teacher: "Jabed Ahmed" },
  { id: "r-3", day: "Sun", start: "08:45", end: "09:20", subject: "English Language", teacher: "" },
  { id: "r-4", day: "Sun", start: "09:20", end: "09:35", subject: "Snacks Break", teacher: "" },
  { id: "r-5", day: "Sun", start: "09:35", end: "10:05", subject: "Physical Education & Sports", teacher: "" },
  { id: "r-6", day: "Sun", start: "10:05", end: "10:40", subject: "English Literature", teacher: "" },
  { id: "r-7", day: "Sun", start: "10:40", end: "11:15", subject: "Geography", teacher: "" },
  { id: "r-8", day: "Mon", start: "08:00", end: "08:10", subject: "National Anthem & Surah Fatiha", teacher: "" },
  { id: "r-9", day: "Mon", start: "08:10", end: "08:45", subject: "Maths", teacher: "Rafiqul Islam" },
  { id: "r-10", day: "Mon", start: "08:45", end: "09:20", subject: "Science", teacher: "Tania Akter" },
];

/** Parse pasted school-diary text into entries. Supports "Subject | C.W | H.W" and "Subject: C.W - H.W". */
export function parseDiaryText(text: string, date: string): Omit<DiaryEntry, "id">[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      let parts: string[] = [];
      if (line.includes("|")) parts = line.split("|");
      else if (line.includes("\t")) parts = line.split("\t");
      else if (line.includes(":")) {
        const idx = line.indexOf(":");
        parts = [line.slice(0, idx), line.slice(idx + 1)];
      } else parts = [line];
      const [subject = "", cw = "", hw = "", answer = ""] = parts.map((p) => p.trim());
      return { date, subject: subject || "General", cw, hw, answer };
    })
    .filter((e) => e.subject || e.cw || e.hw);
}

type Ctx = {
  diary: DiaryEntry[];
  routine: RoutineEntry[];
  addDiary: (e: Omit<DiaryEntry, "id">) => void;
  addDiaryMany: (list: Omit<DiaryEntry, "id">[]) => void;
  updateDiary: (id: string, patch: Partial<DiaryEntry>) => void;
  removeDiary: (id: string) => void;
  addRoutine: (e: Omit<RoutineEntry, "id">) => void;
  updateRoutine: (id: string, patch: Partial<RoutineEntry>) => void;
  removeRoutine: (id: string) => void;
};

const SchoolContentContext = createContext<Ctx | null>(null);
const KEY = "wafi.school-content";
const uid = () => Math.random().toString(36).slice(2, 10);

export function SchoolContentProvider({ children }: { children: ReactNode }) {
  const [diary, setDiary] = useState<DiaryEntry[]>(seedDiary);
  const [routine, setRoutine] = useState<RoutineEntry[]>(seedRoutine);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { diary?: DiaryEntry[]; routine?: RoutineEntry[] };
        if (parsed.diary) setDiary(parsed.diary);
        if (parsed.routine) setRoutine(parsed.routine);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ diary, routine }));
    } catch {
      /* ignore */
    }
  }, [diary, routine]);

  const addDiary = useCallback((e: Omit<DiaryEntry, "id">) => {
    setDiary((p) => [{ ...e, id: uid() }, ...p]);
  }, []);
  const addDiaryMany = useCallback((list: Omit<DiaryEntry, "id">[]) => {
    setDiary((p) => [...list.map((e) => ({ ...e, id: uid() })), ...p]);
  }, []);
  const updateDiary = useCallback((id: string, patch: Partial<DiaryEntry>) => {
    setDiary((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);
  const removeDiary = useCallback((id: string) => {
    setDiary((p) => p.filter((e) => e.id !== id));
  }, []);

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
      addDiary,
      addDiaryMany,
      updateDiary,
      removeDiary,
      addRoutine,
      updateRoutine,
      removeRoutine,
    }),
    [diary, routine, addDiary, addDiaryMany, updateDiary, removeDiary, addRoutine, updateRoutine, removeRoutine],
  );

  return <SchoolContentContext.Provider value={value}>{children}</SchoolContentContext.Provider>;
}

export function useSchoolContent() {
  const ctx = useContext(SchoolContentContext);
  if (!ctx) throw new Error("useSchoolContent must be used inside SchoolContentProvider");
  return ctx;
}

export function sortRoutine(list: RoutineEntry[]) {
  return [...list].sort((a, b) => a.start.localeCompare(b.start));
}
