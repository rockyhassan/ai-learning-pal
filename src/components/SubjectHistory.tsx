import { useState, useMemo } from "react";
import { SectionCard } from "@/components/app-shell";
import { DiaryItemCard } from "@/components/diary-item-card";
import { useApp } from "@/lib/app-state";
import {
  type DiaryEntry,
  formatDiaryDate,
  getUniqueDiarySubjects,
  filterDiaryBySubject,
} from "@/lib/school-content";

interface SubjectHistoryProps {
  diary: DiaryEntry[];
}

export function SubjectHistory({ diary }: SubjectHistoryProps) {
  const { t } = useApp();

  // Get unique subjects from diary, sorted alphabetically
  const subjects = useMemo(() => getUniqueDiarySubjects(diary), [diary]);

  // Start with first subject, or empty if no subjects
  const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0] ?? "");

  // Get entries for selected subject, sorted by date (newest first)
  const entries = useMemo(
    () => (selectedSubject ? filterDiaryBySubject(diary, selectedSubject) : []),
    [diary, selectedSubject],
  );

  if (subjects.length === 0) {
    return null; // Don't render if no diary entries
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
            value={selectedSubject}
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
