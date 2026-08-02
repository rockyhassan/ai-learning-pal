import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/parent-mode")({
  head: () => ({
    meta: [
      { title: "Parent Mode — Wafi" },
      { name: "description", content: "A daily teaching plan for parents: what to teach, what to revise and how to explain it." },
      { property: "og:title", content: "Parent Mode — Wafi" },
      { property: "og:description", content: "Guided coaching plan for parents, every day." },
    ],
  }),
  component: ParentMode,
});

function ParentMode() {
  const { t } = useApp();
  return (
    <PageShell title={t("Parent Mode", "প্যারেন্ট মোড")} subtitle={t("Today's teaching plan", "আজকের পড়ানোর পরিকল্পনা")}>
      <SectionCard title={t("Teach today", "আজ পড়াবেন")} hint={<Pill tone="primary">25 min</Pill>}>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm">
          <li>{t("Science: water cycle — read together", "বিজ্ঞান: পানিচক্র — একসাথে পড়ুন")}</li>
          <li>{t("Math: fractions basics with paper folding", "গণিত: কাগজ ভাঁজ করে ভগ্নাংশ")}</li>
          <li>{t("English: 5 present simple sentences", "ইংরেজি: ৫টি present simple বাক্য")}</li>
        </ol>
      </SectionCard>

      <SectionCard title={t("Revise", "রিভিশন")}>
        <div className="flex flex-wrap gap-2">
          {["Multiplication 6-9", "Bangla poem lines 1-8", "Spelling: vegetable"].map((r) => (
            <Pill key={r} tone="accent">
              {r}
            </Pill>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("Where he is weak", "কোথায় দুর্বল")}>
        <ul className="space-y-2 text-sm">
          <li className="rounded-2xl bg-destructive/10 px-3 py-2">
            {t("Fractions — mixes up numerator and denominator", "ভগ্নাংশ — লব ও হর গুলিয়ে ফেলে")}
          </li>
          <li className="rounded-2xl bg-warning/15 px-3 py-2">
            {t("Past tense — forgets irregular verbs", "Past tense — irregular verb ভুলে যায়")}
          </li>
        </ul>
      </SectionCard>

      <SectionCard title={t("How to explain", "কীভাবে বুঝাবেন")}>
        <p className="text-sm leading-relaxed">
          {t(
            "Use a chapati or a chocolate bar. Cut into 4 pieces: the bottom number is how many pieces in total, the top number is how many he takes.",
            "একটি রুটি বা চকলেট চার টুকরো করুন। নিচের সংখ্যা = মোট কত টুকরো, উপরের সংখ্যা = সে কয় টুকরো নিল।",
          )}
        </p>
      </SectionCard>

      <SectionCard title={t("Ask Parent AI", "প্যারেন্ট এআই-কে জিজ্ঞেস করুন")} className="gradient-card">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
          <input
            placeholder={t("Today I'll teach Science…", "আজ বিজ্ঞান পড়াবো…")}
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button className="tap grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Send className="size-4" />
          </button>
        </div>
        <p className="mt-3 rounded-2xl bg-muted px-3 py-3 text-sm leading-relaxed">
          {t(
            "Start with the water cycle picture, then explain evaporation with a hot tea example, then ask these 5 questions, then take the 6-question quiz.",
            "প্রথমে পানিচক্রের ছবি দেখান, তারপর গরম চায়ের উদাহরণে বাষ্পীভবন বুঝান, তারপর এই ৫টি প্রশ্ন করুন, শেষে ৬ প্রশ্নের কুইজ দিন।",
          )}
        </p>
      </SectionCard>
    </PageShell>
  );
}