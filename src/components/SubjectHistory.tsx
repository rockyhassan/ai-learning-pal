import { useState, useMemo, useEffect } from "react";
import { SectionCard } from "@/components/app-shell";
import { DiaryItemCard } from "@/components/diary-item-card";
import { useApp } from "@/lib/app-state";
import {
  type DiaryEntry,
  type RoutineEntry,
  formatDiaryDate,
  getUniqueSubjects,
  filterDiaryBySubject,
  useSchoolContent,
} from "@/lib/school-content";

interface SubjectHistoryProps {
  diary?: DiaryEntry[];
  routine?: RoutineEntry[];
}

export function SubjectHistory({ diary: propDiary }: SubjectHistoryProps = {}) {
  const { t } = useApp();
  const schoolContent = useSchoolContent();
  const diary = propDiary ?? schoolContent.diary;

  // Get unique, normalized subjects strictly from live diary entries
  const subjects = useMemo(() => getUniqueSubjects(diary), [diary]);

  // Track the user-selected subject
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  // Determine active subject, auto-selecting first subject if empty or not matching available subjects
  const activeSubject = useMemo(() => {
    if (subjects.length === 0) return "";
    if (
      selectedSubject &&
      subjects.some((s) => s.toLowerCase() === selectedSubject.trim().toLowerCase())
    ) {
      return (
        subjects.find((s) => s.toLowerCase() === selectedSubject.trim().toLowerCase()) ??
        selectedSubject
      );
    }
    return subjects[0] ?? "";
  }, [subjects, selectedSubject]);

  // Keep internal state in sync with valid activeSubject
  useEffect(() => {
    if (activeSubject && activeSubject !== selectedSubject) {
      setSelectedSubject(activeSubject);
    }
  }, [activeSubject, selectedSubject]);

  // Get entries for selected subject, matched case-insensitively and sorted newest first
  const entries = useMemo(
    () => (activeSubject ? filterDiaryBySubject(diary, activeSubject) : []),
    [diary, activeSubject],
  );

  if (subjects.length === 0) {
    return (
      <SectionCard title={t("Subject History", "বিষয়ের ইতিহাস")}>
        <p className="text-sm text-muted-foreground">
          {t("No subjects found in diary or routine.", "ডায়েরি বা রুটিনে কোনো বিষয় পাওয়া যায়নি।")}
        </p>
      </SectionCard>
    );
  }

  // Group entries by date
  const entriesByDate = entries.reduce(
    (acc, entry) => {
      if (!entry.date) return acc;
      if (!acc[entry.date]) {
        acc[entry.date] = [];
      }
      acc[entry.date].push(entry);
      return acc;
    },
    {} as Record<string, DiaryEntry[]>,
  );

  const sortedDates = Object.keys(entriesByDate).sort((a, b) => b.localeCompare(a));

  return (
    <SectionCard title={t("Subject History", "বিষয়ের ইতিহাস")}>
      <div className="mb-4">
        <label className="text-xs font-bold text-muted-foreground block mb-2">
          {t("Select Subject", "বিষয় নির্বাচন করুন")}
        </label>
        <div className="relative">
          <select
            value={activeSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-3 py-2.5 text-sm font-semibold outline-none appearance-none pr-10 cursor-pointer hover:bg-muted transition-colors"
          >
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            ▼
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("No history for this subject.", "এই বিষয়ের কোনো ইতিহাস নেই।")}
        </p>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date}>
              <p className="text-xs font-bold text-muted-foreground mb-2">
                {formatDiaryDate(date)}
              </p>
              <ul className="space-y-3">
                {entriesByDate[date].map((d) => (
                  <li key={d.id}>
                    <DiaryItemCard entry={d} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
