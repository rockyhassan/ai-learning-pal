import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { subjects } from "@/lib/mock-data";

export const Route = createFileRoute("/question-bank")({
  head: () => ({
    meta: [
      { title: "Question Bank — Wafi" },
      { name: "description", content: "Every chapter question with easy, medium and detailed answers." },
      { property: "og:title", content: "Question Bank — Wafi" },
      { property: "og:description", content: "Chapter-wise questions and model answers." },
    ],
  }),
  component: QuestionBank,
});

const levels = [
  { key: "easy", en: "Easy", bn: "সহজ" },
  { key: "medium", en: "Medium", bn: "মাঝারি" },
  { key: "detailed", en: "Detailed", bn: "বিস্তারিত" },
];

const answers: Record<string, string> = {
  easy: "Water goes up, makes clouds, then falls as rain.",
  medium:
    "The sun heats water. It evaporates, forms clouds by condensation, and falls back as rain.",
  detailed:
    "Evaporation → condensation → precipitation → collection. Heat from the sun turns water into vapour; the vapour cools high in the sky and condenses into clouds; when droplets become heavy they fall as rain; the water collects in rivers and seas and the cycle repeats.",
};

function QuestionBank() {
  const { t, lang } = useApp();
  const [level, setLevel] = useState("easy");

  return (
    <PageShell title={t("Question Bank", "প্রশ্নব্যাংক")} subtitle={t("All chapters", "সব অধ্যায়")}>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {subjects.slice(0, 6).map((s, i) => (
          <button
            key={s.slug}
            className={`tap shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
              i === 3 ? "bg-primary text-primary-foreground" : "border border-border bg-card"
            }`}
          >
            {s.emoji} {lang === "bn" ? s.bn : s.en}
          </button>
        ))}
      </div>

      <SectionCard title={t("Question 1", "প্রশ্ন ১")} hint={<Pill tone="info">Chapter 3</Pill>}>
        <p className="text-sm font-semibold">What is the water cycle?</p>
        <div className="mt-3 flex gap-2">
          {levels.map((l) => (
            <button
              key={l.key}
              onClick={() => setLevel(l.key)}
              className={`tap flex-1 rounded-2xl py-2 text-xs font-bold ${
                level === l.key ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {t(l.en, l.bn)}
            </button>
          ))}
        </div>
        <p className="mt-3 rounded-2xl bg-muted px-3 py-3 text-sm leading-relaxed">{answers[level]}</p>
      </SectionCard>

      {["Name three states of matter.", "Why do we need plants?", "What is condensation?"].map((q, i) => (
        <SectionCard key={q} title={`${t("Question", "প্রশ্ন")} ${i + 2}`}>
          <p className="text-sm font-semibold">{q}</p>
          <button className="mt-2 text-xs font-bold text-primary">{t("Show answer", "উত্তর দেখাও")} →</button>
        </SectionCard>
      ))}
    </PageShell>
  );
}