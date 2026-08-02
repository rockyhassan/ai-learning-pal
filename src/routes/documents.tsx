import { createFileRoute } from "@tanstack/react-router";
import { PageShell, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Wafi" },
      { name: "description", content: "Books, worksheets, notes, certificates, results and photos stored in one folder." },
      { property: "og:title", content: "Documents — Wafi" },
      { property: "og:description", content: "All school documents in one place." },
    ],
  }),
  component: Documents,
});

const folders = [
  { emoji: "📘", en: "Books", bn: "বই", n: 9 },
  { emoji: "📄", en: "Worksheets", bn: "ওয়ার্কশিট", n: 24 },
  { emoji: "🗒️", en: "Notes", bn: "নোট", n: 18 },
  { emoji: "🎓", en: "Certificates", bn: "সনদ", n: 4 },
  { emoji: "🏅", en: "Results", bn: "ফলাফল", n: 6 },
  { emoji: "🖼️", en: "Photos", bn: "ছবি", n: 32 },
];

function Documents() {
  const { t } = useApp();
  return (
    <PageShell title={t("Documents", "ডকুমেন্ট")} subtitle={t("Saved files", "সংরক্ষিত ফাইল")}>
      <div className="grid grid-cols-2 gap-3">
        {folders.map((f) => (
          <SectionCard key={f.en} className="gradient-card">
            <span className="text-2xl">{f.emoji}</span>
            <p className="mt-2 text-sm font-bold">{t(f.en, f.bn)}</p>
            <p className="text-[11px] text-muted-foreground">
              {f.n} {t("files", "ফাইল")}
            </p>
          </SectionCard>
        ))}
      </div>
      <button className="tap w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-soft">
        {t("Upload File", "ফাইল আপলোড")}
      </button>
    </PageShell>
  );
}