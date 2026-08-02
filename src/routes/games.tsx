import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { student } from "@/lib/mock-data";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Learning Games — Wafi" },
      { name: "description", content: "Math, vocabulary, spelling, puzzle and memory games that make studying fun." },
      { property: "og:title", content: "Learning Games — Wafi" },
      { property: "og:description", content: "Play and learn with coin rewards." },
    ],
  }),
  component: Games,
});

const games = [
  { emoji: "➗", en: "Math Game", bn: "গণিত গেম", best: 920 },
  { emoji: "🔤", en: "Vocabulary", bn: "শব্দ গেম", best: 780 },
  { emoji: "🧩", en: "Puzzle", bn: "ধাঁধা", best: 640 },
  { emoji: "🐝", en: "Spelling", bn: "বানান", best: 1100 },
  { emoji: "🃏", en: "Memory", bn: "মেমোরি", best: 540 },
];

function Games() {
  const { t } = useApp();
  return (
    <PageShell
      title={t("Games", "গেম")}
      subtitle={t("Learn while playing", "খেলতে খেলতে শেখা")}
      action={<Pill tone="accent">🪙 {student.coins}</Pill>}
    >
      {games.map((g) => (
        <SectionCard key={g.en}>
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl gradient-card text-2xl">{g.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-bold">{t(g.en, g.bn)}</p>
              <p className="text-[11px] text-muted-foreground">
                {t("Best", "সেরা")}: {g.best}
              </p>
            </div>
            <button className="tap rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
              {t("Play", "খেলো")}
            </button>
          </div>
        </SectionCard>
      ))}
    </PageShell>
  );
}