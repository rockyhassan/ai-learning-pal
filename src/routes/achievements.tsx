import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/lib/app-state";
import { achievements, student } from "@/lib/mock-data";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — Wafi" },
      { name: "description", content: "Stars, coins, badges, levels and daily streaks that keep learning fun." },
      { property: "og:title", content: "Achievements — Wafi" },
      { property: "og:description", content: "Badges and rewards for every milestone." },
    ],
  }),
  component: Achievements,
});

function Achievements() {
  const { t, lang } = useApp();
  return (
    <PageShell title={t("Achievements", "অর্জন")} subtitle={`${t("Level", "লেভেল")} ${student.level}`}>
      <SectionCard className="gradient-card">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { v: student.stars, en: "Stars", bn: "স্টার", e: "⭐" },
            { v: student.coins, en: "Coins", bn: "কয়েন", e: "🪙" },
            { v: student.streak, en: "Streak", bn: "ধারা", e: "🔥" },
          ].map((s) => (
            <div key={s.en}>
              <p className="text-xl">{s.e}</p>
              <p className="text-lg font-extrabold">{s.v}</p>
              <p className="text-[11px] text-muted-foreground">{t(s.en, s.bn)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[11px] font-semibold">
            <span>
              {t("Level", "লেভেল")} {student.level}
            </span>
            <span className="text-muted-foreground">340 / 500 XP</span>
          </div>
          <Progress value={68} className="h-2" />
        </div>
      </SectionCard>

      <SectionCard title={t("Badges", "ব্যাজ")} hint={<Pill tone="accent">{achievements.length}</Pill>}>
        <div className="grid grid-cols-3 gap-3">
          {achievements.map((a) => (
            <div key={a.name} className="rounded-2xl bg-muted px-2 py-3 text-center">
              <p className="text-2xl">{a.emoji}</p>
              <p className="mt-1 text-[11px] font-semibold leading-tight">
                {lang === "bn" ? a.nameBn : a.name}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageShell>
  );
}