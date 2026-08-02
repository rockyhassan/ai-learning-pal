import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/app-shell";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/lib/app-state";
import { subjects } from "@/lib/mock-data";

export const Route = createFileRoute("/study/")({
  head: () => ({
    meta: [
      { title: "Study Subjects — Wafi" },
      { name: "description", content: "Browse every school subject with chapters and lessons for your class." },
      { property: "og:title", content: "Study Subjects — Wafi" },
      { property: "og:description", content: "English, Bangla, Math, Science, BGS, ICT and more." },
    ],
  }),
  component: Study,
});

function Study() {
  const { t, lang } = useApp();
  return (
    <PageShell title={t("Study", "পড়াশোনা")} subtitle={t("All subjects", "সব বিষয়")}>
      <div className="grid grid-cols-2 gap-3">
        {subjects.map((s) => (
          <Link
            key={s.slug}
            to="/study/$subject"
            params={{ subject: s.slug }}
            className="tap rounded-3xl border border-border gradient-card p-4 shadow-soft"
          >
            <span className="text-2xl">{s.emoji}</span>
            <p className="mt-2 text-sm font-bold leading-tight">{lang === "bn" ? s.bn : s.en}</p>
            <Progress value={s.progress} className="mt-2 h-1.5" />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {s.progress}% · {s.chapters.length} {t("chapters", "অধ্যায়")}
            </p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}