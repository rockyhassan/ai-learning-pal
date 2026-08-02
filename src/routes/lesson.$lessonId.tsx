import { createFileRoute } from "@tanstack/react-router";
import { Play, Volume2 } from "lucide-react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/lesson/$lessonId")({
  head: () => ({
    meta: [
      { title: "Lesson — Wafi" },
      {
        name: "description",
        content: "Lesson text, Bangla explanation, easy English, vocabulary, pronunciation and parent tips.",
      },
      { property: "og:title", content: "Lesson — Wafi" },
      { property: "og:description", content: "Read, listen and understand each lesson step by step." },
    ],
  }),
  component: LessonPage,
});

function LessonPage() {
  const { lessonId } = Route.useParams();
  const { t } = useApp();
  const [subject, chapter, lesson] = lessonId.split("-");

  return (
    <PageShell
      title={t("Present Simple", "সাধারণ বর্তমান কাল")}
      subtitle={`${subject} · ${t("Chapter", "অধ্যায়")} ${chapter} · ${t("Lesson", "লেসন")} ${lesson}`}
      back="/study"
    >
      <SectionCard className="gradient-card">
        <div className="flex flex-wrap gap-2">
          <Pill tone="primary">📖 {t("Text", "পাঠ")}</Pill>
          <Pill tone="accent">🎬 {t("Video", "ভিডিও")}</Pill>
          <Pill tone="success">🗣️ {t("Read Aloud", "পড়ে শোনাও")}</Pill>
        </div>
      </SectionCard>

      <SectionCard title={t("Lesson Text", "পাঠ")}>
        <p className="text-sm leading-relaxed">
          We use the <strong>present simple</strong> to talk about things we do every day. For
          example: “I go to school at eight o'clock.” “Wafi plays football on Friday.”
        </p>
      </SectionCard>

      <SectionCard title={t("Bangla Explanation", "বাংলা ব্যাখ্যা")}>
        <p className="text-sm leading-relaxed">
          যেসব কাজ আমরা প্রতিদিন করি, সেগুলো বোঝাতে Present Simple ব্যবহার করি। যেমন — “আমি আটটায়
          স্কুলে যাই।” মনে রেখো: He / She / It এর পরে ক্রিয়ার শেষে <strong>s</strong> বসে।
        </p>
      </SectionCard>

      <SectionCard title={t("Easy English", "সহজ ইংরেজি")}>
        <p className="text-sm leading-relaxed">
          Every day = present simple. Add <strong>-s</strong> for he, she, it. That's all!
        </p>
      </SectionCard>

      <SectionCard title={t("Pronunciation", "উচ্চারণ")}>
        <ul className="space-y-2">
          {[
            { w: "school", ipa: "/skuːl/" },
            { w: "o'clock", ipa: "/əˈklɒk/" },
            { w: "Friday", ipa: "/ˈfraɪdeɪ/" },
          ].map((p) => (
            <li key={p.w} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2">
              <button className="tap grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
                <Volume2 className="size-4" />
              </button>
              <span className="flex-1 text-sm font-semibold">{p.w}</span>
              <span className="text-xs text-muted-foreground">{p.ipa}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={t("Vocabulary", "শব্দার্থ")}>
        <ul className="space-y-1.5 text-sm">
          {[
            ["every day", "প্রতিদিন"],
            ["always", "সবসময়"],
            ["sometimes", "কখনও কখনও"],
          ].map(([en, bn]) => (
            <li key={en} className="flex justify-between gap-3 border-b border-border pb-1.5 last:border-0">
              <span className="font-semibold">{en}</span>
              <span className="text-muted-foreground">{bn}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={t("Video / Animation", "ভিডিও / অ্যানিমেশন")}>
        <button className="tap flex aspect-video w-full items-center justify-center rounded-2xl gradient-hero text-primary-foreground">
          <Play className="size-8" />
        </button>
      </SectionCard>

      <SectionCard title={t("Important Notes", "গুরুত্বপূর্ণ নোট")}>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>He / She / It + verb + s</li>
          <li>I / We / You / They + verb</li>
          <li>Negative: do not / does not + verb</li>
        </ul>
      </SectionCard>

      <SectionCard title={t("Common Mistakes", "সাধারণ ভুল")}>
        <ul className="space-y-2 text-sm">
          <li className="rounded-2xl bg-destructive/10 px-3 py-2">
            ❌ He go to school → ✅ He <strong>goes</strong> to school
          </li>
          <li className="rounded-2xl bg-destructive/10 px-3 py-2">
            ❌ She don't like → ✅ She <strong>doesn't</strong> like
          </li>
        </ul>
      </SectionCard>

      <SectionCard title={t("Teacher Notes", "শিক্ষকের নোট")}>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t(
            "Ms. Nabila: practise 10 sentences aloud before the class test.",
            "মিস নাবিলা: ক্লাস টেস্টের আগে ১০টি বাক্য মুখে বলে অনুশীলন করবে।",
          )}
        </p>
      </SectionCard>

      <SectionCard title={t("Parent Tips", "অভিভাবকের টিপস")} className="border-accent/40 bg-accent/10">
        <p className="text-sm leading-relaxed">
          {t(
            "Ask your child to describe their daily routine in 5 sentences. Correct only the -s ending.",
            "সন্তানকে ৫টি বাক্যে তার দৈনন্দিন রুটিন বলতে বলুন। শুধু -s যুক্ত হওয়ার ভুলটা ঠিক করে দিন।",
          )}
        </p>
      </SectionCard>
    </PageShell>
  );
}