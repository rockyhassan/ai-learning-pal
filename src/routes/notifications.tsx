import { createFileRoute } from "@tanstack/react-router";
import { PageShell, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Wafi" },
      { name: "description", content: "Homework, exam, revision, reading time and school notice alerts." },
      { property: "og:title", content: "Notifications — Wafi" },
      { property: "og:description", content: "Never miss homework or a school notice." },
    ],
  }),
  component: Notifications,
});

const items = [
  { emoji: "📝", en: "Math homework due in 2 hours", bn: "গণিত হোমওয়ার্ক ২ ঘণ্টায় জমা", time: "2h" },
  { emoji: "🧪", en: "Science quiz in 3 days", bn: "৩ দিনে বিজ্ঞান কুইজ", time: "1d" },
  { emoji: "🔁", en: "Revise multiplication tables", bn: "নামতা রিভিশন করো", time: "1d" },
  { emoji: "📖", en: "Reading time — 7:00 PM", bn: "পড়ার সময় — সন্ধ্যা ৭টা", time: "2d" },
  { emoji: "📢", en: "School notice: uniform day Thursday", bn: "স্কুল নোটিশ: বৃহস্পতিবার ইউনিফর্ম দিবস", time: "3d" },
];

function Notifications() {
  const { t } = useApp();
  return (
    <PageShell title={t("Notifications", "নোটিফিকেশন")} subtitle={`${items.length} ${t("new", "নতুন")}`}>
      <SectionCard>
        <ul className="divide-y divide-border">
          {items.map((i) => (
            <li key={i.en} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-muted text-base">
                {i.emoji}
              </span>
              <p className="flex-1 text-sm font-medium leading-snug">{t(i.en, i.bn)}</p>
              <span className="text-[11px] text-muted-foreground">{i.time}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </PageShell>
  );
}