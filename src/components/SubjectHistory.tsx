import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, BookOpen, Clock, AlertCircle } from "lucide-react";
import { SectionCard, Pill } from "@/components/app-shell";
import { DiaryItemCard } from "@/components/diary-item-card";
import { useApp } from "@/lib/app-state";
import {
  type DiaryEntry,
  type RoutineEntry,
  formatDiaryDate,
  useSchoolContent,
} from "@/lib/school-content";
import {
  resolveCanonicalSubject,
  getSubjectMeta,
  MASTER_SUBJECTS,
} from "@/lib/subjects";

interface SubjectHistoryProps {
  diary?: DiaryEntry[];
  routine?: RoutineEntry[];
}

interface SubjectGroup {
  subjectName: string;
  meta: ReturnType<typeof getSubjectMeta>;
  entries: DiaryEntry[];
  latestDate: string;
  hasRecentHw: boolean;
  totalEntries: number;
}

export function SubjectHistory({ diary: propDiary }: SubjectHistoryProps = {}) {
  const { t } = useApp();
  const schoolContent = useSchoolContent();
  const diary = propDiary ?? schoolContent.diary;

  const safeDiary = Array.isArray(diary) ? diary : [];

  // Group all diary records by canonical subject
  const subjectGroups = useMemo<SubjectGroup[]>(() => {
    const map = new Map<string, DiaryEntry[]>();

    safeDiary.forEach((entry) => {
      if (!entry.subject || !entry.subject.trim()) return;
      const canonical = resolveCanonicalSubject(entry.subject);
      const list = map.get(canonical) || [];
      list.push(entry);
      map.set(canonical, list);
    });

    const groups: SubjectGroup[] = [];

    // Prioritize master subjects order, followed by any remaining custom subjects
    const processed = new Set<string>();

    MASTER_SUBJECTS.forEach((ms) => {
      const entries = map.get(ms.name);
      if (entries && entries.length > 0) {
        processed.add(ms.name.toLowerCase());
        // Sort entries by date descending (newest first)
        const sorted = [...entries].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        const latestEntry = sorted[0];
        const hasHw = sorted.some((e) => !!e.hw && e.hw.trim().length > 0);

        groups.push({
          subjectName: ms.name,
          meta: getSubjectMeta(ms.name),
          entries: sorted,
          latestDate: latestEntry?.date || "",
          hasRecentHw: hasHw,
          totalEntries: sorted.length,
        });
      }
    });

    // Add any other subjects in database not in master list
    map.forEach((entries, subjectName) => {
      if (!processed.has(subjectName.toLowerCase())) {
        const sorted = [...entries].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        const latestEntry = sorted[0];
        const hasHw = sorted.some((e) => !!e.hw && e.hw.trim().length > 0);

        groups.push({
          subjectName,
          meta: getSubjectMeta(subjectName),
          entries: sorted,
          latestDate: latestEntry?.date || "",
          hasRecentHw: hasHw,
          totalEntries: sorted.length,
        });
      }
    });

    return groups;
  }, [safeDiary]);

  // Track expanded accordion cards (default: first 3 subjects or subjects with latest entries)
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    subjectGroups.slice(0, 3).forEach((g) => initial.add(g.subjectName));
    return initial;
  });

  const toggleSubject = (subjectName: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subjectName)) {
        next.delete(subjectName);
      } else {
        next.add(subjectName);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedSubjects(new Set(subjectGroups.map((g) => g.subjectName)));
  };

  const handleCollapseAll = () => {
    setExpandedSubjects(new Set());
  };

  if (subjectGroups.length === 0) {
    return (
      <SectionCard title={t("Subject History", "বিষয়ের ইতিহাস")}>
        <div className="py-8 text-center">
          <BookOpen className="mx-auto size-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-semibold text-muted-foreground">
            {t("No subject history recorded yet.", "ডায়েরিতে এখনো কোনো বিষয়ের ইতিহাস নেই।")}
          </p>
        </div>
      </SectionCard>
    );
  }

  const allExpanded = expandedSubjects.size === subjectGroups.length;

  return (
    <div className="space-y-4">
      {/* Header with Quick Actions */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t("Subjects", "বিষয়সমূহ")}
          </span>
          <Pill tone="primary">{subjectGroups.length}</Pill>
        </div>

        <button
          type="button"
          onClick={allExpanded ? handleCollapseAll : handleExpandAll}
          className="tap inline-flex items-center gap-1 rounded-xl bg-card border border-border px-3 py-1.5 text-xs font-bold text-primary hover:bg-muted transition-colors"
        >
          <ChevronsUpDown className="size-3.5" />
          <span>
            {allExpanded
              ? t("Collapse All", "সবগুলো গুটিয়ে নিন")
              : t("Expand All", "সবগুলো খুলুন")}
          </span>
        </button>
      </div>

      {/* Collapsible Subject Cards */}
      <div className="space-y-3">
        {subjectGroups.map((group) => {
          const isExpanded = expandedSubjects.has(group.subjectName);

          // Group entries by date within this subject
          const entriesByDate = group.entries.reduce(
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
            <div
              key={group.subjectName}
              className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-soft transition-all"
            >
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => toggleSubject(group.subjectName)}
                className="tap w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Subject Icon Badge */}
                  <div
                    className={`size-11 shrink-0 rounded-2xl flex items-center justify-center text-xl shadow-xs border ${group.meta.bgClass} ${group.meta.borderClass}`}
                  >
                    <span>{group.meta.emoji}</span>
                  </div>

                  {/* Subject Name & Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-foreground leading-tight">
                        {group.subjectName}
                      </h3>
                      {group.meta.nameBn && (
                        <span className="text-xs font-medium text-muted-foreground">
                          ({group.meta.nameBn})
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Clock className="size-3 text-muted-foreground/70" />
                        {formatDiaryDate(group.latestDate)}
                      </span>
                      <span>•</span>
                      <span>
                        {group.totalEntries} {t("records", "টি এন্ট্রি")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Badges & Chevron */}
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  {group.hasRecentHw && (
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <AlertCircle className="size-3" />
                      {t("H.W", "এইচ.ডব্লু")}
                    </span>
                  )}

                  <div
                    className={`size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground transition-transform duration-200 ${
                      isExpanded ? "rotate-180 bg-primary/10 text-primary" : ""
                    }`}
                  >
                    <ChevronDown className="size-4" />
                  </div>
                </div>
              </button>

              {/* Accordion Body */}
              {isExpanded && (
                <div className="p-4 pt-1 border-t border-border/60 bg-muted/20 space-y-4 animate-in fade-in-50 duration-150">
                  {sortedDates.map((date) => (
                    <div key={date} className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground px-1">
                        {formatDiaryDate(date)}
                      </p>
                      <ul className="space-y-2.5">
                        {(entriesByDate[date] || []).map((entry) => (
                          <li key={entry.id}>
                            <DiaryItemCard entry={entry} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
