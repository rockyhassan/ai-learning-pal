import { createFileRoute } from "@tanstack/react-router";
import { PageShell, SectionCard, TileGrid } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/practice")({
  head: () => ({
    meta: [
      { title: "Practice — Wafi" },
      { name: "description", content: "Quizzes, MCQ, true/false, fill in the blanks, matching, speaking and listening practice." },
      { property: "og:title", content: "Practice — Wafi" },
      { property: "og:description", content: "Daily practice in every question format." },
    ],
  }),
  component: Practice,
});

function Practice() {
  const { t } = useApp();
  const modes = [
    { to: "/practice", emoji: "🎯", label: t("Quiz", "কুইজ"), sub: "10 Q" },
    { to: "/practice", emoji: "🔘", label: t("MCQ", "এমসিকিউ"), sub: "20 Q" },
    { to: "/practice", emoji: "✔️", label: t("True / False", "সত্য / মিথ্যা"), sub: "15 Q" },
    { to: "/practice", emoji: "✏️", label: t("Fill Blank", "শূন্যস্থান"), sub: "12 Q" },
    { to: "/practice", emoji: "🔗", label: t("Matching", "মিলকরণ"), sub: "8 Q" },
    { to: "/practice", emoji: "🗣️", label: t("Speaking", "বলা"), sub: "5 Q" },
    { to: "/practice", emoji: "🎧", label: t("Listening", "শোনা"), sub: "6 Q" },
  ];

  return (
    <PageShell title={t("Practice", "অনুশীলন")} subtitle={t("Pick a mode", "একটি ধরন বেছে নাও")}>
      <SectionCard title={t("Today's set", "আজকের সেট")}>
        <p className="text-sm font-semibold">Science · Chapter 3 · 10 questions</p>
        <button className="tap mt-3 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground">
          {t("Start Now", "এখনই শুরু")}
        </button>
      </SectionCard>
      <TileGrid items={modes} />
    </PageShell>
  );
}