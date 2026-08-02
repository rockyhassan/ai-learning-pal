import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Save, Volume2 } from "lucide-react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { homework } from "@/lib/mock-data";

export const Route = createFileRoute("/homework/$homeworkId")({
  head: () => ({
    meta: [
      { title: "Homework Solver — Wafi" },
      { name: "description", content: "School answer, easy answer, Bangla explanation, pronunciation and practice for each homework question." },
      { property: "og:title", content: "Homework Solver — Wafi" },
      { property: "og:description", content: "Step-by-step homework help for kids." },
    ],
  }),
  component: HomeworkDetail,
});

function HomeworkDetail() {
  const { homeworkId } = Route.useParams();
  const { t } = useApp();
  const item = homework.find((h) => h.id === homeworkId) ?? homework[0]!;

  return (
    <PageShell title={t(item.title, item.titleBn)} subtitle={`${item.subject} · ${item.due}`} back="/homework">
      <SectionCard title={t("Question", "প্রশ্ন")} hint={<Pill tone="primary">1 / 5</Pill>}>
        <p className="text-sm font-medium leading-relaxed">
          Write five sentences about your family using the present simple tense.
        </p>
      </SectionCard>

      <SectionCard title={t("School Answer", "স্কুলের উত্তর")}>
        <p className="text-sm leading-relaxed">
          My family has four members. My father works in a bank. My mother teaches at a school. My
          sister studies in class two. We live together happily in Dhaka.
        </p>
      </SectionCard>

      <SectionCard title={t("Easy Answer", "সহজ উত্তর")}>
        <p className="text-sm leading-relaxed">
          We are four. Father works. Mother teaches. Sister reads in class two. We live in Dhaka.
        </p>
      </SectionCard>

      <SectionCard title={t("Bangla Explanation", "বাংলা ব্যাখ্যা")}>
        <p className="text-sm leading-relaxed">
          এখানে প্রতিদিনের কাজ বোঝানো হয়েছে, তাই present simple ব্যবহার হয়েছে। father, mother, sister —
          সবাই একবচন, তাই works, teaches, studies-এর শেষে <strong>s / es</strong> বসেছে।
        </p>
      </SectionCard>

      <SectionCard title={t("Pronunciation", "উচ্চারণ")}>
        <div className="flex flex-wrap gap-2">
          {["family", "teaches", "happily"].map((w) => (
            <button key={w} className="tap inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-2 text-sm font-semibold">
              <Volume2 className="size-3.5 text-primary" /> {w}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("Word Meaning", "শব্দার্থ")}>
        <ul className="space-y-1.5 text-sm">
          {[
            ["members", "সদস্য"],
            ["together", "একসাথে"],
            ["happily", "সুখে"],
          ].map(([en, bn]) => (
            <li key={en} className="flex justify-between border-b border-border pb-1.5 last:border-0">
              <span className="font-semibold">{en}</span>
              <span className="text-muted-foreground">{bn}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={t("Practice", "অনুশীলন")}>
        <p className="mb-2 text-sm">Fill in the blank: My mother ___ (teach) at a school.</p>
        <div className="flex gap-2">
          {["teach", "teaches", "teaching"].map((o) => (
            <button key={o} className="tap flex-1 rounded-2xl border border-border bg-muted py-2 text-xs font-bold">
              {o}
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 gap-3">
        <button className="tap flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-bold shadow-soft">
          <Save className="size-4" /> {t("Save", "সেভ")}
        </button>
        <button className="tap flex items-center justify-center gap-2 rounded-2xl bg-success py-3.5 text-sm font-bold text-success-foreground shadow-soft">
          <CheckCircle2 className="size-4" /> {t("Complete", "সম্পন্ন")}
        </button>
      </div>
    </PageShell>
  );
}