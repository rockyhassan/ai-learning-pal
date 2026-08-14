import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Flame, Play, Send } from "lucide-react";
import { BottomNav, LangToggle, Pill, SectionCard } from "@/components/app-shell";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/lib/app-state";
import { exams, homework, routine, student, weeklyProgress } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Wafi Learning" },
      {
        name: "description",
        content: "Today's homework, classes, exam countdown, goals and progress in one place.",
      },
      { property: "og:title", content: "Dashboard — Wafi Learning" },
      { property: "og:description", content: "Homework, classes, exams and daily goals at a glance." },
    ],
  }),
  component: Dashboard,
});

const quickLinks = [
  { to: "/parent-dashboard", emoji: "👪", en: "Parent Dash", bn: "প্যারেন্ট ড্যাশ" },
  { to: "/admin", emoji: "🛡️", en: "Admin", bn: "অ্যাডমিন" },
  { to: "/vocabulary", emoji: "📖", en: "Vocabulary", bn: "শব্দভাণ্ডার" },
  { to: "/pronunciation", emoji: "🎤", en: "Pronunciation", bn: "উচ্চারণ" },
  { to: "/question-bank", emoji: "📚", en: "Question Bank", bn: "প্রশ্নব্যাংক" },
  { to: "/practice", emoji: "🧠", en: "Practice", bn: "অনুশীলন" },
  { to: "/games", emoji: "🎮", en: "Games", bn: "গেম" },
  { to: "/progress", emoji: "📊", en: "Progress", bn: "অগ্রগতি" },
  { to: "/parent-mode", emoji: "👨‍👩‍👦", en: "Parent Mode", bn: "প্যারেন্ট মোড" },
  { to: "/planner", emoji: "📅", en: "Planner", bn: "প্ল্যানার" },
  { to: "/notifications", emoji: "🔔", en: "Alerts", bn: "নোটিফিকেশন" },
  { to: "/documents", emoji: "📁", en: "Documents", bn: "ডকুমেন্ট" },
  { to: "/achievements", emoji: "🏆", en: "Awards", bn: "অর্জন" },
  { to: "/ai-memory", emoji: "🤖", en: "AI Memory", bn: "এআই মেমোরি" },
  { to: "/profile", emoji: "👦", en: "Profile", bn: "প্রোফাইল" },
  { to: "/settings", emoji: "⚙️", en: "Settings", bn: "সেটিংস" },
];

function Dashboard() {
  const { t } = useApp();
  const pending = homework.filter((h) => h.status === "pending");
  const done = homework.filter((h) => h.status === "completed");
  const todayMinutes = weeklyProgress[5]?.minutes ?? 0;

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background pb-28">
      <header className="gradient-hero px-4 pb-8 pt-5 text-primary-foreground">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="tap grid size-11 place-items-center rounded-2xl bg-primary-foreground/15 text-xl">
            🦉
          </Link>
          <div className="flex-1">
            <p className="text-xs opacity-80">{t("Good morning", "শুভ সকাল")}</p>
            <p className="text-lg font-bold leading-tight">{student.nickname}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-bold">
            <Flame className="size-3.5" /> {student.streak}
          </span>
          <LangToggle />
        </div>

        <div className="mt-5 rounded-3xl bg-primary-foreground/12 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>{t("Today's Goal", "আজকের লক্ষ্য")}</span>
            <span>
              {todayMinutes}/30 {t("min", "মিনিট")}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-foreground/25">
            <div
              className="h-full rounded-full gradient-sun"
              style={{ width: `${Math.min(100, (todayMinutes / 30) * 100)}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold">
            <div className="rounded-2xl bg-primary-foreground/12 py-2">
              30 {t("min", "মিনিট")}
            </div>
            <div className="rounded-2xl bg-primary-foreground/12 py-2">3 {t("Lessons", "লেসন")}</div>
            <div className="rounded-2xl bg-primary-foreground/12 py-2">2 {t("Quizzes", "কুইজ")}</div>
          </div>
        </div>
      </header>

      <main className="-mt-4 animate-pop space-y-4 rounded-t-[2rem] bg-background px-4 pt-5">
        <SectionCard
          title={t("Continue Learning", "যেখানে শেষ করেছিলে")}
          hint={<Pill tone="primary">English</Pill>}
        >
          <Link to="/lesson/$lessonId" params={{ lessonId: "english-3-1" }} className="tap flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl gradient-sun text-xl">📘</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">Chapter 3 · Present Simple</p>
              <Progress value={45} className="mt-2 h-1.5" />
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <Play className="size-4" />
            </span>
          </Link>
        </SectionCard>

        <SectionCard
          title={t("Today's Homework", "আজকের হোমওয়ার্ক")}
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
            {homework.slice(0, 3).map((h) => (
              <li key={h.id}>
                <Link
                  to="/homework/$homeworkId"
                  params={{ homeworkId: h.id }}
                  className="tap flex items-center gap-3 rounded-2xl bg-muted px-3 py-2.5"
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
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>

        <div className="grid grid-cols-2 gap-3">
          <SectionCard title={t("Classes", "ক্লাস")} className="col-span-1">
            <ul className="space-y-1.5 text-xs">
              {routine.slice(1, 5).map((r) => (
                <li key={r.time} className="flex gap-2">
                  <span className="font-bold text-primary">{r.time}</span>
                  <span className="truncate">{r.subject}</span>
                </li>
              ))}
            </ul>
            <Link to="/planner" className="mt-3 block text-[11px] font-bold text-primary">
              {t("Full routine", "পুরো রুটিন")} →
            </Link>
          </SectionCard>

          <SectionCard title={t("Exams", "পরীক্ষা")} className="col-span-1">
            <ul className="space-y-2">
              {exams.slice(0, 2).map((e) => (
                <li key={e.name} className="rounded-2xl bg-muted p-2">
                  <p className="text-xs font-bold leading-tight">{e.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{e.chapter}</p>
                  <p className="mt-1 text-sm font-extrabold text-destructive">
                    {e.days} {t("days left", "দিন বাকি")}
                  </p>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <SectionCard title={t("AI Teacher", "এআই শিক্ষক")}>
          <Link
            to="/ai-teacher"
            className="tap flex items-center gap-2 rounded-2xl border border-border bg-muted px-3 py-3"
          >
            <span className="text-lg">🤖</span>
            <span className="flex-1 text-sm text-muted-foreground">
              {t("Ask anything…", "যা খুশি জিজ্ঞেস করো…")}
            </span>
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <Send className="size-4" />
            </span>
          </Link>
        </SectionCard>

        <SectionCard title={t("Score", "স্কোর")}>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { v: "91%", en: "Today", bn: "আজ" },
              { v: "78%", en: "Weekly", bn: "সাপ্তাহিক" },
              { v: "74%", en: "Monthly", bn: "মাসিক" },
            ].map((s) => (
              <div key={s.en} className="rounded-2xl gradient-card p-3">
                <p className="text-xl font-extrabold text-primary">{s.v}</p>
                <p className="text-[11px] text-muted-foreground">{t(s.en, s.bn)}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t("Everything", "সবকিছু")}>
          <div className="grid grid-cols-4 gap-2">
            {quickLinks.map((q) => (
              <Link
                key={q.to}
                to={q.to as "/"}
                className="tap flex flex-col items-center gap-1 rounded-2xl bg-muted px-1 py-3 text-center"
              >
                <span className="text-xl">{q.emoji}</span>
                <span className="text-[10px] font-semibold leading-tight">{t(q.en, q.bn)}</span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </main>
      <BottomNav />
    </div>
  );
}