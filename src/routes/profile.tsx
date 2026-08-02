import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/lib/app-state";
import { achievements, student, subjects } from "@/lib/mock-data";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Student Profile — Wafi" },
      { name: "description", content: "Your child's photo, class, school, progress and achievements in one profile." },
      { property: "og:title", content: "Student Profile — Wafi" },
      { property: "og:description", content: "Everything about your young learner." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t, lang } = useApp();
  return (
    <PageShell title={t("Profile", "প্রোফাইল")} subtitle={student.school}>
      <SectionCard className="gradient-card text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-3xl gradient-sun text-4xl shadow-soft">🦉</div>
        <h2 className="mt-3 text-lg font-extrabold">{student.name}</h2>
        <p className="text-xs text-muted-foreground">
          {student.className} · {t("Section", "শাখা")} {student.section} · {t("Roll", "রোল")} {student.roll}
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <Pill tone="primary">{student.board}</Pill>
          <Pill tone="accent">{student.medium}</Pill>
          <Pill tone="success">🔥 {student.streak}</Pill>
        </div>
      </SectionCard>

      <SectionCard title={t("Progress", "অগ্রগতি")}>
        <ul className="space-y-2.5">
          {subjects.slice(0, 5).map((s) => (
            <li key={s.slug}>
              <div className="mb-1 flex justify-between text-xs font-semibold">
                <span>
                  {s.emoji} {lang === "bn" ? s.bn : s.en}
                </span>
                <span className="text-muted-foreground">{s.progress}%</span>
              </div>
              <Progress value={s.progress} className="h-1.5" />
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={t("Achievements", "অর্জন")}>
        <div className="flex flex-wrap gap-2">
          {achievements.slice(0, 4).map((a) => (
            <Pill key={a.name} tone="accent">
              {a.emoji} {lang === "bn" ? a.nameBn : a.name}
            </Pill>
          ))}
        </div>
        <Link to="/achievements" className="mt-3 block text-xs font-bold text-primary">
          {t("See all", "সব দেখুন")} →
        </Link>
      </SectionCard>
    </PageShell>
  );
}