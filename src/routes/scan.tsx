import { createFileRoute } from "@tanstack/react-router";
import { Camera, ScanLine } from "lucide-react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "AI Scan — Wafi" },
      { name: "description", content: "Scan books, homework, worksheets, notices, routines, results and receipts — AI detects the type." },
      { property: "og:title", content: "AI Scan — Wafi" },
      { property: "og:description", content: "Point the camera, AI understands the page." },
    ],
  }),
  component: Scan,
});

const types = [
  { emoji: "📕", en: "Book Scan", bn: "বই স্ক্যান" },
  { emoji: "📝", en: "Homework Scan", bn: "হোমওয়ার্ক স্ক্যান" },
  { emoji: "📄", en: "Worksheet Scan", bn: "ওয়ার্কশিট স্ক্যান" },
  { emoji: "📢", en: "Notice Scan", bn: "নোটিশ স্ক্যান" },
  { emoji: "🗓️", en: "Routine Scan", bn: "রুটিন স্ক্যান" },
  { emoji: "🏅", en: "Result Scan", bn: "রেজাল্ট স্ক্যান" },
  { emoji: "🧾", en: "Receipt Scan", bn: "রশিদ স্ক্যান" },
];

function Scan() {
  const { t } = useApp();
  return (
    <PageShell title={t("AI Scan", "এআই স্ক্যান")} subtitle={t("AI detects it automatically", "এআই নিজেই বুঝে নেবে")}>
      <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-3xl gradient-hero text-primary-foreground shadow-lift">
        <div className="absolute inset-6 rounded-2xl border-2 border-dashed border-primary-foreground/40" />
        <div className="relative text-center">
          <ScanLine className="mx-auto size-10 animate-pulse" />
          <p className="mt-2 text-sm font-semibold">
            {t("Point at the page", "পৃষ্ঠার দিকে ধরো")}
          </p>
        </div>
      </div>

      <button className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-soft">
        <Camera className="size-5" /> {t("Capture", "ছবি তোলো")}
      </button>

      <SectionCard title={t("What can I scan?", "কী কী স্ক্যান করা যায়?")} hint={<Pill tone="accent">Auto detect</Pill>}>
        <div className="grid grid-cols-2 gap-2">
          {types.map((ty) => (
            <div key={ty.en} className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2.5">
              <span className="text-lg">{ty.emoji}</span>
              <span className="text-xs font-semibold leading-tight">{t(ty.en, ty.bn)}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageShell>
  );
}