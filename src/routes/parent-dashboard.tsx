import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/lib/app-state";
import { exams, homework, student, subjects, teachers, weeklyProgress } from "@/lib/mock-data";

export const Route = createFileRoute("/parent-dashboard")({
  head: () => ({
    meta: [
      { title: "Parent Dashboard — Wafi Learning" },
      {
        name: "description",
        content:
          "Parents see homework status, study time, subject progress, exams and teacher contacts in one dashboard.",
      },
      { property: "og:title", content: "Parent Dashboard — Wafi Learning" },
      {
        property: "og:description",
        content: "Track your child's homework, study minutes, weak topics and upcoming exams.",
      },
    ],
  }),
  component: ParentDashboard,
});

function ParentDashboard() {
  const { t } = useApp();
  const pending = homework.filter((h) => h.status === "pending");
  const done = homework.filter((h) => h.status === "completed");
  const weekMinutes = weeklyProgress.reduce((sum, d) => sum + d.minutes, 0);
  const avgScore = Math.round(
    weeklyProgress.reduce((sum, d) => sum + d.score, 0) / weeklyProgress.length,
  );

  return (
    <PageShell
      title={t("Parent Dashboard", "প্যারেন্ট ড্যাশবোর্ড")}
      subtitle={t(`Guardian of ${student.name}`, `${student.name} এর অভিভাবক`)}
    >
      <SectionCard className="gradient-card">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { v: `${weekMinutes}`, en: "Min this week", bn: "মিনিট এ সপ্তাহে" },
            { v: `${avgScore}%`, en: "Avg score", bn: "গড় স্কোর" },
            { v: `${student.streak}🔥`, en: "Day streak", bn: "দিনের ধারা" },
          ].map((s) => (
            <div key={s.en} className="rounded-2xl bg-card/70 p-3">
              <p className="text-xl font-extrabold text-primary">{s.v}</p>
              <p className="text-[11px] text-muted-foreground">{t(s.en, s.bn)}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={t("Homework today", "আজকের হোমওয়ার্ক")}
        hint={
          <Link to="/homework" className="text-xs font-bold text-primary">
            {t("All", "সব")}
          </Link>
        }
      >
        <div className="mb-3 flex gap-2">
          <Pill tone="warning">
            {pending.length} {t("Pending", "বাকি")}
          </Pill>
          <Pill tone="success">
            {done.length} {t("Completed", "শেষ")}
          </Pill>
        </div>
        <ul className="space-y-2">
          {homework.map((h) => (
            <li
              key={h.id}
              className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2.5"
            >
              <span
                className={`size-2.5 rounded-full ${h.status === "pending" ? "bg-warning" : "bg-success"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t(h.title, h.titleBn)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {h.subject} · {h.due}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={t("Subject progress", "বিষয়ভিত্তিক অগ্রগতি")}>
        <ul className="space-y-3">
          {subjects.slice(0, 5).map((s) => (
            <li key={s.slug}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>
                  {s.emoji} {t(s.en, s.bn)}
                </span>
                <span className="text-muted-foreground">{s.progress}%</span>
              </div>
              <Progress value={s.progress} className="mt-1.5 h-1.5" />
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={t("Upcoming exams", "আসন্ন পরীক্ষা")}>
        <ul className="space-y-2">
          {exams.map((e) => (
            <li key={e.name} className="rounded-2xl bg-muted p-3">
              <p className="text-sm font-bold leading-tight">{e.name}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{e.chapter}</p>
              <p className="mt-1 text-sm font-extrabold text-destructive">
                {e.days} {t("days left", "দিন বাকি")}
              </p>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={t("Teachers", "শিক্ষকগণ")}>
        <ul className="space-y-2">
          {teachers.map((tc) => (
            <li key={tc.name} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2.5">
              <span className="grid size-9 place-items-center rounded-2xl bg-card text-base">
                👩‍🏫
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{tc.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {tc.subject} · {tc.phone}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={t("Quick actions", "দ্রুত অ্যাকশন")}>
        <ul className="space-y-2">
          {[
            { to: "/parent-mode", emoji: "🧑‍🏫", en: "Today's teaching plan", bn: "আজকের পড়ানোর প্ল্যান" },
            { to: "/progress", emoji: "📊", en: "Full progress report", bn: "পূর্ণ অগ্রগতি রিপোর্ট" },
            { to: "/ai-memory", emoji: "🧬", en: "What AI learned", bn: "এআই কী শিখেছে" },
            { to: "/planner", emoji: "📅", en: "Planner & routine", bn: "প্ল্যানার ও রুটিন" },
          ].map((q) => (
            <li key={q.to}>
              <Link
                to={q.to as "/"}
                className="tap flex items-center gap-3 rounded-2xl bg-muted px-3 py-3"
              >
                <span className="text-lg">{q.emoji}</span>
                <span className="flex-1 text-sm font-semibold">{t(q.en, q.bn)}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>
    </PageShell>
  );
}