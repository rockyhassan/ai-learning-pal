import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { useSchoolContent, calculateDaysRemaining, formatDaysRemaining } from "@/lib/school-content";
import { RoutineView } from "@/components/routine-view";

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
  const { routine, exams } = useSchoolContent();
  return (
    <PageShell title={t("Planner", "প্ল্যানার")} subtitle={t("This week", "এই সপ্তাহ")}>
      <SectionCard title={t("Routine", "রুটিন")}>
        <RoutineView routine={routine} />
      </SectionCard>

      <SectionCard title={t("Exams", "পরীক্ষা")}>
        <ul className="space-y-2">
          {exams.map((e) => {
            const daysRemaining = calculateDaysRemaining(e.date);
            return (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2.5">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{e.name}</p>
                  <p className="text-[11px] text-muted-foreground">{e.chapter}</p>
                </div>
                <Pill tone={daysRemaining < 0 ? "muted" : daysRemaining <= 3 ? "destructive" : "primary"}>
                  {Math.abs(daysRemaining)}d
                </Pill>
              </li>
            );
          })}
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
