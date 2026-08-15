import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { LangToggle } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wafi — Your Child's AI Learning Companion" },
      {
        name: "description",
        content:
          "Wafi helps school students with homework, lessons, pronunciation and quizzes — explained in Bangla and English.",
      },
      { property: "og:title", content: "Wafi — Your Child's AI Learning Companion" },
      {
        property: "og:description",
        content: "Homework, lessons, AI teacher and progress tracking for kids.",
      },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { t } = useApp();

  return (
    <div className="relative mx-auto flex min-h-screen max-w-lg flex-col overflow-hidden gradient-hero px-6 py-10 text-primary-foreground">
      <div className="pointer-events-none absolute -left-16 top-24 size-56 rounded-full bg-accent/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 size-64 rounded-full bg-success/25 blur-3xl" />

      <div className="relative flex justify-end">
        <LangToggle />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <div className="animate-float grid size-28 place-items-center rounded-[2rem] gradient-sun shadow-lift">
          <span className="text-5xl">🦉</span>
        </div>
        <h1 className="mt-8 text-4xl font-extrabold tracking-tight">Wafi</h1>
        <p className="mt-3 max-w-xs text-balance text-lg font-medium opacity-90">
          {t("Your Child's AI Learning Companion", "আপনার সন্তানের এআই শেখার সঙ্গী")}
        </p>

        <div className="mt-10 grid w-full grid-cols-3 gap-2 text-[11px] font-semibold">
          {[
            { e: "📝", en: "Homework", bn: "হোমওয়ার্ক" },
            { e: "🤖", en: "AI Teacher", bn: "এআই শিক্ষক" },
            { e: "📈", en: "Progress", bn: "অগ্রগতি" },
          ].map((f) => (
            <div
              key={f.en}
              className="rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 px-2 py-3"
            >
              <div className="text-xl">{f.e}</div>
              <div className="mt-1 opacity-90">{t(f.en, f.bn)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative space-y-3">
        <Link
          to="/signup"
          className="tap animate-ring flex w-full items-center justify-center gap-2 rounded-full gradient-sun px-6 py-4 text-base font-extrabold text-accent-foreground shadow-lift"
        >
          <Sparkles className="size-5" />
          {t("Start", "শুরু করি")}
        </Link>
        <Link
          to="/login"
          className="tap block w-full rounded-full border border-primary-foreground/30 py-3 text-center text-sm font-semibold opacity-90"
        >
          {t("I already have access — Sign in", "আমার অ্যাক্সেস আছে — সাইন ইন")}
        </Link>
      </div>
    </div>
  );
}
