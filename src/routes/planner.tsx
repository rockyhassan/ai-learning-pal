import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { exams, homework } from "@/lib/mock-data";
import { sortRoutine, todayWeekday, useSchoolContent, weekdays, type Weekday } from "@/lib/school-content";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner — Wafi" },
      { name: "description", content: "Homework, class routine, exams, holidays and reminders in one planner." },
      { property: "og:title", content: "Planner — Wafi" },
      { property: "og:description", content: "Plan the school week in one place." },
    ],
  }),
  component: Planner,
});

function Planner() {
  const { t } = useApp();
  const { routine } = useSchoolContent();
  const [day, setDay] = useState<Weekday>(todayWeekday());
  const dayRoutine = sortRoutine(routine.filter((r) => r.day === day));
  return (
    <PageShell title={t("Planner", "প্ল্যানার")} subtitle={t("This week", "এই সপ্তাহ")}>
      <SectionCard title={t("Routine", "রুটিন")}>
        <div className="mb-3 flex flex-wrap gap-2">
          {weekdays.map((d) => (
            <button
              key={d.key}
              onClick={() => setDay(d.key)}
              className={`tap rounded-full px-3 py-1.5 text-[11px] font-bold ${
                day === d.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t(d.en, d.bn)}
            </button>
          ))}
        </div>
        {dayRoutine.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No classes today.", "আজ কোনো ক্লাস নেই।")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {dayRoutine.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-24 shrink-0 text-[11px] font-bold text-primary">
                  {r.start} – {r.end}
                </span>
                <div className="flex-1">
                  <p className="font-medium">{r.subject}</p>
                  <p className="text-[11px] text-muted-foreground">{r.teacher || "—"}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={t("Homework", "হোমওয়ার্ক")}>
        <ul className="space-y-2 text-sm">
          {homework.map((h) => (
            <li key={h.id} className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2">
              <span className={h.status === "pending" ? "text-warning" : "text-success"}>●</span>
              <span className="flex-1 truncate">{t(h.title, h.titleBn)}</span>
              <span className="text-[11px] text-muted-foreground">{h.due}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={t("Exams", "পরীক্ষা")}>
        <ul className="space-y-2">
          {exams.map((e) => (
            <li key={e.name} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2.5">
              <div className="flex-1">
                <p className="text-sm font-semibold">{e.name}</p>
                <p className="text-[11px] text-muted-foreground">{e.chapter}</p>
              </div>
              <Pill tone="destructive">{e.days}d</Pill>
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="grid grid-cols-2 gap-3">
        <SectionCard title={t("Holidays", "ছুটি")}>
          <p className="text-sm font-semibold">🎉 Eid Holiday</p>
          <p className="text-[11px] text-muted-foreground">12–18 next month</p>
        </SectionCard>
        <SectionCard title={t("Reminders", "রিমাইন্ডার")}>
          <p className="text-sm font-semibold">⏰ 7:00 PM</p>
          <p className="text-[11px] text-muted-foreground">{t("Reading time", "পড়ার সময়")}</p>
        </SectionCard>
      </div>
    </PageShell>
  );
}