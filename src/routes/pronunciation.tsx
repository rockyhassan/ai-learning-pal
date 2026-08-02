import { createFileRoute } from "@tanstack/react-router";
import { Mic, Volume2 } from "lucide-react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/pronunciation")({
  head: () => ({
    meta: [
      { title: "Pronunciation Coach — Wafi" },
      { name: "description", content: "Listen, repeat and get an AI pronunciation score on words and sentences." },
      { property: "og:title", content: "Pronunciation Coach — Wafi" },
      { property: "og:description", content: "Speak, repeat and improve with AI scoring." },
    ],
  }),
  component: Pronunciation,
});

function Pronunciation() {
  const { t } = useApp();
  return (
    <PageShell title={t("Pronunciation", "উচ্চারণ")} subtitle={t("Listen · Repeat · Score", "শোনো · বলো · স্কোর")}>
      <SectionCard className="text-center">
        <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Say this word", "এই শব্দটি বলো")}</p>
        <h2 className="mt-2 text-3xl font-extrabold">vegetable</h2>
        <p className="text-sm text-muted-foreground">/ˈvedʒtəbl/ · সবজি</p>
        <div className="mt-5 flex items-center justify-center gap-4">
          <button className="tap grid size-12 place-items-center rounded-full bg-muted">
            <Volume2 className="size-5 text-primary" />
          </button>
          <button className="tap animate-ring grid size-20 place-items-center rounded-full gradient-sun text-accent-foreground shadow-lift">
            <Mic className="size-8" />
          </button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t("Tap the mic and repeat", "মাইকে চাপ দিয়ে বলো")}</p>
      </SectionCard>

      <SectionCard title={t("AI Score", "এআই স্কোর")} hint={<Pill tone="success">82%</Pill>}>
        <Progress value={82} className="h-2" />
        <ul className="mt-3 space-y-2 text-sm">
          <li className="rounded-2xl bg-success/10 px-3 py-2">✅ ve — {t("clear", "স্পষ্ট")}</li>
          <li className="rounded-2xl bg-warning/15 px-3 py-2">⚠️ ge — {t("say 'j' softly", "নরম 'জ' বলো")}</li>
          <li className="rounded-2xl bg-success/10 px-3 py-2">✅ table — {t("good", "ভালো")}</li>
        </ul>
      </SectionCard>

      <SectionCard title={t("Sentence Practice", "বাক্য অনুশীলন")}>
        <p className="text-sm font-medium">“I eat vegetables every day.”</p>
        <div className="mt-3 flex gap-2">
          <button className="tap flex-1 rounded-2xl bg-muted py-2.5 text-xs font-bold">
            {t("Listen", "শোনো")}
          </button>
          <button className="tap flex-1 rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground">
            {t("Repeat", "বলো")}
          </button>
        </div>
      </SectionCard>
    </PageShell>
  );
}