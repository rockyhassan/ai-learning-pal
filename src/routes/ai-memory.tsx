import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { aiMemory } from "@/lib/mock-data";

export const Route = createFileRoute("/ai-memory")({
  head: () => ({
    meta: [
      { title: "AI Memory — Wafi" },
      { name: "description", content: "Wafi remembers what your child knows, forgets and mispronounces, then adapts the learning plan." },
      { property: "og:title", content: "AI Memory — Wafi" },
      { property: "og:description", content: "A learning plan that adapts to your child automatically." },
    ],
  }),
  component: AiMemory,
});

function AiMemory() {
  const { t, lang } = useApp();
  return (
    <PageShell title={t("AI Memory", "এআই মেমোরি")} subtitle={t("What Wafi's AI remembers", "এআই যা মনে রেখেছে")}>
      {aiMemory.map((m) => (
        <SectionCard key={m.label} title={lang === "bn" ? m.labelBn : m.label}>
          <div className="flex flex-wrap gap-2">
            {m.items.map((i) => (
              <Pill key={i} tone={m.tone as "success"}>
                {i}
              </Pill>
            ))}
          </div>
        </SectionCard>
      ))}

      <SectionCard title={t("Updated Learning Plan", "নতুন শেখার পরিকল্পনা")} className="gradient-card">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm">
          <li>{t("5 extra minutes on fractions daily", "প্রতিদিন ভগ্নাংশে বাড়তি ৫ মিনিট")}</li>
          <li>{t("Pronunciation drill: 'world', 'vegetable'", "উচ্চারণ অনুশীলন: 'world', 'vegetable'")}</li>
          <li>{t("Water cycle flashcards twice this week", "এই সপ্তাহে দুবার পানিচক্র ফ্ল্যাশকার্ড")}</li>
        </ol>
      </SectionCard>
    </PageShell>
  );
}