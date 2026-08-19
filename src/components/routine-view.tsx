import { useState } from "react";
import { Calendar, Clock, Sparkles } from "lucide-react";
import { useApp } from "@/lib/app-state";
import {
  actualSchoolWeekday,
  sortRoutine,
  todayWeekday,
  weekdays,
  type Weekday,
  type RoutineEntry,
} from "@/lib/school-content";

/**
 * Get emoji icon based on subject keywords
 * Used for both special slots (break, prayer, etc.) and academic subjects
 */
function getSlotIcon(subject: string): string {
  const lower = subject.toLowerCase();
  if (lower.includes("break") || lower.includes("snack")) return "☕";
  if (lower.includes("prayer") || lower.includes("zuhr") || lower.includes("salah"))
    return "🕌";
  if (lower.includes("sports") || lower.includes("physical")) return "⚽";
  if (lower.includes("anthem") || lower.includes("surah")) return "🎵";
  if (lower.includes("math")) return "📐";
  if (lower.includes("science")) return "🔬";
  if (lower.includes("english")) return "📚";
  if (lower.includes("bangla")) return "✍️";
  if (lower.includes("geography")) return "🌍";
  return "📖";
}

/**
 * Determine if an entry is a special period (break, prayer, etc.)
 * vs. a regular academic period
 */
function isSpecialSlot(subject: string): boolean {
  const lower = subject.toLowerCase();
  return (
    lower.includes("break") ||
    lower.includes("snack") ||
    lower.includes("prayer") ||
    lower.includes("anthem") ||
    lower.includes("assembly") ||
    lower.includes("sports") ||
    lower.includes("physical")
  );
}

interface RoutineViewProps {
  routine: RoutineEntry[];
  /** Optional callback when day is selected */
  onDayChange?: (day: Weekday) => void;
  /** Optional initial day (defaults to today) */
  initialDay?: Weekday;
}

/**
 * Shared Routine View component for displaying routine entries
 * Used by Dashboard Class Routine card and Planner page
 *
 * Handles:
 * - Weekday selector
 * - Today indicator
 * - Day-based filtering and sorting
 * - Empty state
 * - Period display with icons, times, subjects, teachers
 * - Special vs academic slot styling
 */
export function RoutineView({
  routine,
  onDayChange,
  initialDay,
}: RoutineViewProps) {
  const { t, lang } = useApp();
  const [selectedDay, setSelectedDay] = useState<Weekday>(
    initialDay || todayWeekday()
  );

  const currentDay = actualSchoolWeekday();
  const dayRoutine = sortRoutine(routine.filter((r) => r.day === selectedDay));

  const handleDayChange = (day: Weekday) => {
    setSelectedDay(day);
    onDayChange?.(day);
  };

  const getDayLabel = (day: Weekday): string => {
    const labels: Record<
      Weekday,
      { en: string; bn: string; short: string; shortBn: string }
    > = {
      Sun: { en: "Sunday", bn: "রবিবার", short: "Sun", shortBn: "রবি" },
      Mon: { en: "Monday", bn: "সোমবার", short: "Mon", shortBn: "সোম" },
      Tue: { en: "Tuesday", bn: "মঙ্গলবার", short: "Tue", shortBn: "মঙ্গল" },
      Wed: {
        en: "Wednesday",
        bn: "বুধবার",
        short: "Wed",
        shortBn: "বুধ",
      },
      Thu: {
        en: "Thursday",
        bn: "বৃহস্পতিবার",
        short: "Thu",
        shortBn: "বৃহঃ",
      },
    };
    const label = labels[day];
    return label ? (lang === "bn" ? label.bn : label.en) : "";
  };

  let academicPeriodCounter = 0;

  return (
    <div>
      {/* Weekday selector buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 -mx-1 px-1 scrollbar-none">
        {weekdays.map((d) => {
          const isSelected = selectedDay === d.key;
          const isToday = d.key === currentDay;
          return (
            <button
              key={d.key}
              onClick={() => handleDayChange(d.key)}
              className={`tap shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted"
              } ${isToday && !isSelected ? "border border-primary/40 text-primary" : ""}`}
            >
              {d.key}
              {isToday && <span className="ml-1 text-[8px]">•</span>}
            </button>
          );
        })}
      </div>

      {/* Routine entries or empty state */}
      <div className="mt-1">
        {dayRoutine.length === 0 ? (
          <div className="py-8 text-center rounded-2xl border border-dashed border-muted/60 bg-muted/10">
            <span className="text-2xl">🎉</span>
            <p className="text-xs font-semibold text-muted-foreground mt-1">
              {t(
                "No classes scheduled for this day",
                "এই দিনে কোনো ক্লাস নেই"
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {dayRoutine.map((slot, index) => {
              const special = isSpecialSlot(slot.subject);
              const icon = getSlotIcon(slot.subject);

              if (!special) {
                academicPeriodCounter += 1;
              }

              const periodNumber = String(academicPeriodCounter).padStart(
                2,
                "0"
              );

              return (
                <div
                  key={slot.id || index}
                  className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border transition-all ${
                    special
                      ? "bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-200"
                      : "bg-card border-border/60 hover:border-primary/30 hover:shadow-soft"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className={`shrink-0 size-6 rounded-lg flex items-center justify-center font-extrabold text-[10px] ${
                        special
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {special ? icon : periodNumber}
                    </div>

                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <h4 className="text-[11px] font-bold text-foreground truncate leading-none">
                        {slot.subject}
                      </h4>
                      {!special && <span className="text-[10px] shrink-0">{icon}</span>}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 text-[9.5px] font-bold text-foreground/80 border border-muted/70">
                      <Clock className="size-2.5 text-muted-foreground shrink-0" />
                      <span className="whitespace-nowrap">
                        {slot.start} - {slot.end}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with summary */}
      {dayRoutine.length > 0 && (
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="size-3 text-primary" />
            <span className="font-semibold text-foreground">
              {getDayLabel(selectedDay)}
            </span>
          </div>
          <div className="flex items-center gap-1 font-medium">
            <Sparkles className="size-3 text-amber-500" />
            <span>
              {academicPeriodCounter} {t("Academic Periods", "টি একাডেমিক পিরিয়ড")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
