import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Send, ChevronDown } from "lucide-react";
import { useState } from "react";
import { BottomNav, SectionCard } from "@/components/app-shell";
import { DashboardHeader } from "@/components/dashboard-header";
import { TodayRoutineCard } from "@/components/today-routine-card";
import { useApp } from "@/lib/app-state";
import { useAccess } from "@/lib/access-store";
import { featureForRoute, isSessionOnlyRoute } from "@/lib/route-access";
import { useSchoolContent, formatDiaryDate, calculateDaysRemaining, formatDaysRemaining, getDateCategory } from "@/lib/school-content";

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
];

function Dashboard() {
  const { t } = useApp();
  const { can } = useAccess();
  const { diary, exams } = useSchoolContent();
  const [expandedOlderDates, setExpandedOlderDates] = useState<Set<string>>(new Set());

  const visibleLinks = quickLinks.filter((q) => {
    if (isSessionOnlyRoute(q.to)) return true;
    const feature = featureForRoute(q.to);
    return !feature || can(feature);
  });

  // Group all diary entries by date, sorted descending (newest first)
  const safeDiary = Array.isArray(diary) ? diary : [];
  const diaryByDate = [...safeDiary]
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    })
    .reduce((acc, entry) => {
      if (!entry.date) return acc;
      if (!acc[entry.date]) {
        acc[entry.date] = [];
      }
      acc[entry.date].push(entry);
      return acc;
    }, {} as Record<string, typeof diary>);

  const sortedDates = Object.keys(diaryByDate).sort((a, b) => b.localeCompare(a));

  const toggleDateExpansion = (date: string) => {
    setExpandedOlderDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const isDateExpanded = (date: string): boolean => {
    const category = getDateCategory(date);
    if (category === "today" || category === "yesterday") {
      return true;
    }
    return expandedOlderDates.has(date);
  };

  return (
    <div className="relative min-h-screen w-full bg-background pb-28">
      {/* Sticky Header with curved bottom edge */}
      <DashboardHeader />

      {/* Scrollable Dashboard Content */}
      <main className="-mt-4 mx-auto max-w-[800px] space-y-4 rounded-t-[2rem] bg-background px-4 pt-5 animate-pop">
        <SectionCard
          title={t("School Diary", "স্কুল ডায়েরি")}
          hint={
            <Link to="/homework" className="text-xs font-bold text-primary">
              {t("All", "সব")}
            </Link>
          }
        >
          {safeDiary.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No school diary available.", "কোন স্কুল ডায়েরি পাওয়া যায়নি।")}</p>
          ) : (
            <div className="space-y-4">
              {sortedDates.map((date) => {
                const category = getDateCategory(date);
                const isExpanded = isDateExpanded(date);

                return (
                  <div key={date}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-bold text-muted-foreground">{formatDiaryDate(date)}</p>
                      {category === "older" && (
                        <button
                          onClick={() => toggleDateExpansion(date)}
                          className="ml-auto tap flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                          aria-expanded={isExpanded}
                        >
                          <span>{isExpanded ? t("Hide", "লুকান") : t("Show", "দেখান")}</span>
                          <ChevronDown
                            className="size-3.5 transition-transform duration-200"
                            style={{
                              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                        </button>
                      )}
                    </div>
                    {isExpanded && (
                      <ul className="space-y-2 animate-in fade-in duration-200">
                        {diaryByDate[date].map((d) => (
                          <li key={d.id}>
                            <Link
                              to="/homework/diary/$diaryId"
                              params={{ diaryId: d.id }}
                              className="tap flex items-center gap-3 rounded-2xl bg-muted px-3 py-2.5"
                            >
                              <div className="flex-1">
                                <p className="truncate text-sm font-semibold">{d.subject}</p>
                                <div className="mt-1 space-y-0.5">
                                  {d.cw && (
                                    <p className="text-[11px] text-muted-foreground">
                                      {t("C.W", "সি.ডব্লু")}: {d.cw}
                                    </p>
                                  )}
                                  {d.hw && (
                                    <p className="text-[11px] text-muted-foreground">
                                      {t("H.W", "এইচ.ডব্লু")}: {d.hw}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="size-4 text-muted-foreground" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <TodayRoutineCard />

        <SectionCard title={t("Exams", "পরীক্ষা")}>
          <ul className="space-y-2">
            {(exams || []).slice(0, 2).map((e) => {
              const daysRemaining = calculateDaysRemaining(e.date);
              return (
                <li key={e.id} className="rounded-2xl bg-muted p-2">
                  <p className="text-xs font-bold leading-tight">{e.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{e.chapter}</p>
                  <p className="mt-1 text-sm font-extrabold text-destructive">
                    {formatDaysRemaining(daysRemaining)}
                  </p>
                </li>
              );
            })}
          </ul>
        </SectionCard>

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
            {visibleLinks.map((q) => (
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