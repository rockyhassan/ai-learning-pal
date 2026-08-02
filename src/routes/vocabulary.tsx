import { createFileRoute } from "@tanstack/react-router";
import { Heart, Volume2 } from "lucide-react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { vocabulary } from "@/lib/mock-data";

export const Route = createFileRoute("/vocabulary")({
  head: () => ({
    meta: [
      { title: "Vocabulary — Wafi" },
      { name: "description", content: "Word meanings, pronunciation, examples, audio and word quizzes for young learners." },
      { property: "og:title", content: "Vocabulary — Wafi" },
      { property: "og:description", content: "Build your child's word power daily." },
    ],
  }),
  component: Vocabulary,
});

function Vocabulary() {
  const { t } = useApp();
  return (
    <PageShell title={t("Vocabulary", "শব্দভাণ্ডার")} subtitle={`${vocabulary.length} ${t("new words today", "নতুন শব্দ আজ")}`}>
      {vocabulary.map((v) => (
        <SectionCard key={v.word}>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold">{v.word}</h3>
                <Pill tone="primary">{v.ipa}</Pill>
              </div>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">{v.bn}</p>
              <p className="mt-2 rounded-2xl bg-muted px-3 py-2 text-xs italic">{v.example}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button className="tap grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
                <Volume2 className="size-4" />
              </button>
              <button className="tap grid size-9 place-items-center rounded-full bg-muted text-destructive">
                <Heart className="size-4" />
              </button>
            </div>
          </div>
        </SectionCard>
      ))}
      <button className="tap w-full rounded-2xl bg-accent py-3.5 text-sm font-bold text-accent-foreground shadow-soft">
        {t("Start Word Quiz", "শব্দ কুইজ শুরু")}
      </button>
    </PageShell>
  );
}