import { ChevronDown } from "lucide-react";
import { SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { todayWeekday, actualSchoolWeekday, type Weekday, useSchoolContent } from "@/lib/school-content";
import { RoutineView } from "@/components/routine-view";
import { useState } from "react";

export function TodayRoutineCard() {
  const { t } = useApp();
  const { routine } = useSchoolContent();
  const [selectedDay, setSelectedDay] = useState<Weekday>(todayWeekday());

  const dayKeys: Weekday[] = ["Sun", "Mon", "Tue", "Wed", "Thu"];
  const currentDay = actualSchoolWeekday();

  const getDayLabel = (day: Weekday): string => {
    const labels: Record<Weekday, { en: string; bn: string }> = {
      Sun: { en: "Sunday", bn: "রবিবার" },
      Mon: { en: "Monday", bn: "সোমবার" },
      Tue: { en: "Tuesday", bn: "মঙ্গলবার" },
      Wed: { en: "Wednesday", bn: "বুধবার" },
      Thu: { en: "Thursday", bn: "বৃহস্পতিবার" },
    };
    const label = labels[day];
    return label ? t(label.en, label.bn) : "";
  };

  return (
    <SectionCard
      title={t("Class Routine", "ক্লাস রুটিন")}
      hint={
        <div className="relative">
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value as Weekday)}
            className="appearance-none rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 pr-6 text-[11px] font-bold text-primary cursor-pointer transition-all hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {dayKeys.map((day) => (
              <option key={day} value={day} className="text-foreground bg-card">
                {getDayLabel(day)}
                {day === currentDay && ` • ${t("Today", "আজ")}`}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-primary pointer-events-none" />
        </div>
      }
    >
      <RoutineView
        routine={routine}
        initialDay={selectedDay}
        onDayChange={setSelectedDay}
      />
    </SectionCard>
  );
}
