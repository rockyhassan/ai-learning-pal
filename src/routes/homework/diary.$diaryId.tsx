import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Edit3,
  Lightbulb,
  MessageSquare,
  Pencil,
  Save,
  Sparkles,
  Volume2,
  HelpCircle,
} from "lucide-react";
import { useState } from "react";
import { PageShell, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import {
  useSchoolContent,
  type DiaryEntry,
  getUniqueSubjects,
  normalizeSubject,
  formatDiaryDate,
} from "@/lib/school-content";
import { useAccess } from "@/lib/access-store";
import { getSubjectMeta } from "@/lib/subjects";
import { DiaryContentEditor } from "@/components/DiaryContentEditor";
import { DiaryContentRenderer } from "@/components/DiaryContentRenderer";
import { hasRichTextContent } from "@/lib/rich-text";
import { gameAudio } from "@/lib/game-audio";

export const Route = createFileRoute("/homework/diary/$diaryId")({
  head: () => ({
    meta: [
      { title: "School Diary — Wafi" },
      { name: "description", content: "School diary entry with classwork, homework, and answers." },
      { property: "og:title", content: "School Diary — Wafi" },
      { property: "og:description", content: "View your school diary entry." },
    ],
  }),
  component: DiaryDetail,
});

// Helper: Parse comma-separated pronunciation words
function parsePronunciation(text: string): string[] {
  return text
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);
}

// Helper: Serialize pronunciation array to comma-separated string
function serializePronunciation(arr?: string[]): string {
  return arr?.join(", ") ?? "";
}

// Helper: Parse word → meaning pairs from plain text
function parseWordMeanings(text: string): Array<{ word: string; meaning: string }> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      let idx = line.indexOf("→");
      if (idx === -1) idx = line.indexOf("->");
      if (idx === -1) return null;
      const word = line.slice(0, idx).trim();
      const meaning = line.slice(idx + (line[idx] === "→" ? 1 : 2)).trim();
      if (!word || !meaning) return null;
      return { word, meaning };
    })
    .filter(Boolean) as Array<{ word: string; meaning: string }>;
}

// Helper: Serialize word meanings to "word → meaning" format
function serializeWordMeanings(arr?: Array<{ word: string; meaning: string }>): string {
  return arr?.map((p) => `${p.word} → ${p.meaning}`).join("\n") ?? "";
}

// Adapter: Convert DiaryContentEditor JSON blocks to wordMeanings array
function blocksToWordMeanings(jsonString: string): Array<{ word: string; meaning: string }> | undefined {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.blocks || !Array.isArray(parsed.blocks)) return undefined;

    const meanings = parsed.blocks
      .map((block: any) => {
        const line = block.text?.trim();
        if (!line) return null;

        let idx = line.indexOf("→");
        if (idx === -1) idx = line.indexOf("->");
        if (idx === -1) return null;

        const word = line.slice(0, idx).trim();
        const meaning = line.slice(idx + (line[idx] === "→" ? 1 : 2)).trim();
        if (!word || !meaning) return null;
        return { word, meaning };
      })
      .filter(Boolean);

    return meanings.length > 0 ? meanings : undefined;
  } catch {
    return undefined;
  }
}

// Adapter: Convert wordMeanings array to DiaryContentEditor JSON format
function wordMeaningsToBlocks(arr?: Array<{ word: string; meaning: string }>): string {
  if (!arr || arr.length === 0) {
    return JSON.stringify({ blocks: [{ type: "paragraph", text: "", align: "left", marks: [] }] });
  }

  const blocks = arr.map((item) => ({
    type: "paragraph",
    text: `${item.word} → ${item.meaning}`,
    align: "left" as const,
    marks: [] as const,
  }));

  return JSON.stringify({ blocks });
}

// Helper: Parse comma-separated practice options
function parsePracticeOptions(text: string): string[] {
  return text
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

// Helper: Serialize practice options to comma-separated string
function serializePracticeOptions(arr?: string[]): string {
  return arr?.join(", ") ?? "";
}

type AnswerTabKey =
  | "answer"
  | "teacherAnswer"
  | "easyAnswer"
  | "banglaExplanation"
  | "wordMeanings";

const ANSWER_TABS: Array<{
  id: AnswerTabKey;
  labelEn: string;
  labelBn: string;
  icon: typeof Sparkles;
  placeholderEn: string;
  placeholderBn: string;
}> = [
  {
    id: "answer",
    labelEn: "School Answer",
    labelBn: "স্কুল উত্তর",
    icon: Sparkles,
    placeholderEn: "Write or format your school answer...",
    placeholderBn: "স্কুল উত্তর লিখুন বা ফরম্যাট করুন...",
  },
  {
    id: "teacherAnswer",
    labelEn: "Teacher's Answer",
    labelBn: "শিক্ষকের উত্তর",
    icon: CheckCircle2,
    placeholderEn: "Teacher's answer / solution...",
    placeholderBn: "শিক্ষকের উত্তর / সমাধান...",
  },
  {
    id: "easyAnswer",
    labelEn: "Easy Answer",
    labelBn: "সহজ উত্তর",
    icon: Lightbulb,
    placeholderEn: "Simplified version of the answer...",
    placeholderBn: "উত্তরের সরল সংস্করণ...",
  },
  {
    id: "banglaExplanation",
    labelEn: "Bangla Explanation",
    labelBn: "বাংলা ব্যাখ্যা",
    icon: MessageSquare,
    placeholderEn: "Explanation in Bangla...",
    placeholderBn: "বাংলায় ব্যাখ্যা...",
  },
  {
    id: "wordMeanings",
    labelEn: "Word Meanings",
    labelBn: "শব্দার্থ",
    icon: BookOpen,
    placeholderEn: "Example: members → সদস্য (one per line)",
    placeholderBn: "উদাহরণ: members → সদস্য (এক লাইনে একটি)",
  },
];

function DiaryDetail() {
  const { diaryId } = Route.useParams();
  const { t } = useApp();
  const { currentUser } = useAccess();
  const { diary, routine, updateDiary } = useSchoolContent();
  const entry = diary.find((d) => d.id === diaryId);
  const isAdmin = currentUser?.role === "admin";

  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<DiaryEntry | null>(null);
  const [activeAnswerTab, setActiveAnswerTab] = useState<AnswerTabKey>("answer");
  const [selectedPracticeOption, setSelectedPracticeOption] = useState<string | null>(null);

  if (!entry) {
    return (
      <PageShell
        title={t("Diary Entry", "ডায়েরি এন্ট্রি")}
        subtitle={t("Not found", "খুঁজে পাওয়া যায়নি")}
        back="/homework"
      >
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
          <p className="text-sm text-muted-foreground">
            {t("This diary entry could not be found.", "এই ডায়েরি এন্ট্রি খুঁজে পাওয়া যায়নি।")}
          </p>
          <Link
            to="/homework"
            className="tap mt-4 inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            {t("Back to Homework", "হোমওয়ার্কে ফিরে যান")}
          </Link>
        </div>
      </PageShell>
    );
  }

  const field =
    "w-full rounded-2xl border border-border bg-muted px-3 py-2 text-sm outline-none";

  const getTabContentState = (tabId: AnswerTabKey) => {
    if (!form) {
      return {
        value: "",
        onChange: () => {},
        hasContent: false,
      };
    }
    switch (tabId) {
      case "answer":
        return {
          value: form.answer ?? "",
          onChange: (value: string) => setForm({ ...form, answer: value }),
          hasContent: hasRichTextContent(form.answer),
        };
      case "teacherAnswer":
        return {
          value: form.teacherAnswer ?? "",
          onChange: (value: string) =>
            setForm({ ...form, teacherAnswer: value || undefined }),
          hasContent: hasRichTextContent(form.teacherAnswer),
        };
      case "easyAnswer":
        return {
          value: form.easyAnswer ?? "",
          onChange: (value: string) =>
            setForm({ ...form, easyAnswer: value || undefined }),
          hasContent: hasRichTextContent(form.easyAnswer),
        };
      case "banglaExplanation":
        return {
          value: form.banglaExplanation ?? "",
          onChange: (value: string) =>
            setForm({ ...form, banglaExplanation: value || undefined }),
          hasContent: hasRichTextContent(form.banglaExplanation),
        };
      case "wordMeanings":
        return {
          value: wordMeaningsToBlocks(form.wordMeanings),
          onChange: (jsonString: string) => {
            const meanings = blocksToWordMeanings(jsonString);
            setForm({ ...form, wordMeanings: meanings || undefined });
          },
          hasContent: Boolean(form.wordMeanings && form.wordMeanings.length > 0),
        };
    }
  };

  // EDIT MODE
  if (edit && form) {
    const currentTabConfig =
      ANSWER_TABS.find((tab) => tab.id === activeAnswerTab) || ANSWER_TABS[0];
    const currentTabState = getTabContentState(activeAnswerTab);

    return (
      <PageShell
        title={t("Edit Diary", "ডায়েরি সম্পাদনা")}
        subtitle={entry.date}
        back="/homework"
      >
        <datalist id="diary-detail-subject-suggestions">
          {getUniqueSubjects(diary, routine).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>

        <SectionCard title={t("Subject", "বিষয়")}>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder={t("Subject", "বিষয়")}
            list="diary-detail-subject-suggestions"
            className={field}
            autoComplete="off"
          />
        </SectionCard>

        <SectionCard title={t("Classwork", "ক্লাসওয়ার্ক")}>
          <DiaryContentEditor
            value={form.cw}
            onChange={(value) => setForm({ ...form, cw: value })}
            placeholder={t("Enter classwork details", "ক্লাসওয়ার্কের বিবরণ লিখুন")}
            rows={2}
          />
        </SectionCard>

        <SectionCard title={t("Homework", "হোমওয়ার্ক")}>
          <DiaryContentEditor
            value={form.hw}
            onChange={(value) => setForm({ ...form, hw: value })}
            placeholder={t("Enter homework details", "হোমওয়ার্কের বিবরণ লিখুন")}
            rows={2}
          />
        </SectionCard>

        <SectionCard title={t("Remarks (optional)", "মন্তব্য (ঐচ্ছিক)")}>
          <DiaryContentEditor
            value={form.remarks || ""}
            onChange={(value) => setForm({ ...form, remarks: value })}
            placeholder={t("Enter remarks or notes", "মন্তব্য বা নোট লিখুন")}
            rows={2}
          />
        </SectionCard>

        {/* Unified Tabbed Answers & Study Helpers */}
        <SectionCard title={t("Answers & Study Helpers", "উত্তর ও সহায়ক তথ্য")}>
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-muted/70 border border-border">
              {ANSWER_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeAnswerTab === tab.id;
                const { hasContent } = getTabContentState(tab.id);

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveAnswerTab(tab.id)}
                    className={`tap relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                      isActive
                        ? "bg-background text-primary shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    }`}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span>{t(tab.labelEn, tab.labelBn)}</span>
                    {hasContent && (
                      <span
                        className="size-1.5 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-500/20"
                        title={t("Contains content", "তথ্য আছে")}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Single Active Editor with key reset */}
            <div>
              <DiaryContentEditor
                key={activeAnswerTab}
                value={currentTabState.value}
                onChange={currentTabState.onChange}
                placeholder={t(
                  currentTabConfig.placeholderEn,
                  currentTabConfig.placeholderBn
                )}
                rows={3}
              />
            </div>
          </div>
        </SectionCard>

        {/* Plain Text Extras: Pronunciation & Practice */}
        <SectionCard title={t("Practice & Pronunciation", "অনুশীলন ও উচ্চারণ")}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground">
                {t("Pronunciation", "উচ্চারণ")} {t("(comma-separated)", "(কমা দ্বারা বিভক্ত)")}
              </label>
              <input
                value={serializePronunciation(form.pronunciation)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    pronunciation: parsePronunciation(e.target.value) || undefined,
                  })
                }
                placeholder={t("Example: family, teaches, happily", "উদাহরণ: family, teaches, happily")}
                className={`mt-1 ${field}`}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">
                {t("Practice Question", "অনুশীলন প্রশ্ন")}
              </label>
              <input
                value={form.practice?.question ?? ""}
                onChange={(e) => {
                  const question = e.target.value;
                  setForm({
                    ...form,
                    practice: question
                      ? { question, options: form.practice?.options ?? [] }
                      : undefined,
                  });
                }}
                placeholder={t("Enter the practice question", "অনুশীলন প্রশ্ন লিখুন")}
                className={`mt-1 ${field}`}
              />
            </div>

            {form.practice?.question && (
              <div>
                <label className="text-xs font-bold text-muted-foreground">
                  {t("Practice Options", "অনুশীলন বিকল্প")} {t("(comma-separated)", "(কমা দ্বারা বিভক্ত)")}
                </label>
                <input
                  value={serializePracticeOptions(form.practice.options)}
                  onChange={(e) => {
                    if (form.practice) {
                      setForm({
                        ...form,
                        practice: {
                          ...form.practice,
                          options: parsePracticeOptions(e.target.value),
                        },
                      });
                    }
                  }}
                  placeholder={t("Example: teach, teaches, teaching", "উদাহরণ: teach, teaches, teaching")}
                  className={`mt-1 ${field}`}
                />
              </div>
            )}
          </div>
        </SectionCard>

        <div className="flex gap-2">
          <button
            onClick={() => {
              const patch: Partial<DiaryEntry> = {
                subject: normalizeSubject(form.subject) || form.subject.trim(),
                cw: form.cw,
                hw: form.hw,
                remarks: form.remarks || "",
                answer: form.answer || "",
                teacherAnswer: form.teacherAnswer || "",
                easyAnswer: form.easyAnswer || "",
                banglaExplanation: form.banglaExplanation || "",
                pronunciation: form.pronunciation?.length ? form.pronunciation : [],
                wordMeanings: form.wordMeanings?.length ? form.wordMeanings : [],
                ...(form.practice?.question ? { practice: form.practice } : {}),
              };
              updateDiary(entry.id, patch);
              setEdit(false);
            }}
            className="tap flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-soft"
          >
            <Save className="size-4" />
            {t("Save", "সেভ")}
          </button>
          <button
            onClick={() => setEdit(false)}
            className="tap flex flex-1 items-center justify-center rounded-2xl bg-card border border-border py-3 text-sm font-bold"
          >
            {t("Cancel", "বাতিল")}
          </button>
        </div>
      </PageShell>
    );
  }

  // VIEW MODE: UNIFIED SCHOOL NOTEBOOK LAYOUT
  const meta = getSubjectMeta(entry.subject);
  const formattedDate = formatDiaryDate(entry.date);

  const hasCw = hasRichTextContent(entry.cw);
  const hasHw = hasRichTextContent(entry.hw);
  const hasAnswer = hasRichTextContent(entry.answer);
  const hasRemarks = hasRichTextContent(entry.remarks);
  const hasTeacherAnswer = hasRichTextContent(entry.teacherAnswer);
  const hasEasyAnswer = hasRichTextContent(entry.easyAnswer);
  const hasBanglaExplanation = hasRichTextContent(entry.banglaExplanation);
  const hasPronunciation = Boolean(entry.pronunciation && entry.pronunciation.length > 0);
  const hasWordMeanings = Boolean(entry.wordMeanings && entry.wordMeanings.length > 0);
  const hasPractice = Boolean(entry.practice?.question);

  const hasAnyContent =
    hasCw ||
    hasHw ||
    hasAnswer ||
    hasRemarks ||
    hasTeacherAnswer ||
    hasEasyAnswer ||
    hasBanglaExplanation ||
    hasPronunciation ||
    hasWordMeanings ||
    hasPractice;

  return (
    <PageShell
      title={entry.subject}
      subtitle={formattedDate}
      back="/homework"
      action={
        isAdmin ? (
          <button
            onClick={() => {
              setForm({
                ...entry,
                cw: entry.cw || "",
                hw: entry.hw || "",
                remarks: entry.remarks || "",
                answer: entry.answer || "",
                teacherAnswer: entry.teacherAnswer || "",
                easyAnswer: entry.easyAnswer || "",
                banglaExplanation: entry.banglaExplanation || "",
              });
              setActiveAnswerTab("answer");
              setEdit(true);
            }}
            className="tap inline-flex items-center gap-1.5 rounded-xl border border-primary-foreground/20 bg-primary-foreground/15 px-3 py-1.5 text-xs font-bold text-primary-foreground backdrop-blur-sm shadow-sm transition-colors hover:bg-primary-foreground/25"
          >
            <Edit3 className="size-3.5" />
            {t("Edit", "এডিট")}
          </button>
        ) : undefined
      }
    >
      {/* UNIFIED SCHOOL NOTEBOOK CONTAINER */}
      <div className="relative rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md shadow-slate-200/50 dark:shadow-none overflow-hidden transition-all">
        
        {/* Notebook Top Header Strip */}
        <div className="relative border-b border-slate-200/80 dark:border-slate-800/90 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/90 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Subject Tag & Emoji */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`size-9 sm:size-10 rounded-xl flex items-center justify-center text-lg sm:text-xl shadow-xs border ${meta.bgClass} ${meta.borderClass}`}
              >
                <span>{meta.emoji}</span>
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  {entry.subject}
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>📓 {t("School Diary Sheet", "স্কুল ডায়েরি পাতা")}</span>
                  {meta.nameBn && (
                    <>
                      <span>•</span>
                      <span>{meta.nameBn}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Date Badge */}
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/60 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Calendar className="size-3.5 text-primary" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Notebook Content Sheet */}
        <div className="relative min-h-[360px] bg-white dark:bg-slate-900">
          {/* Vertical Red/Pink Notebook Margin Line */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 left-6 sm:left-10 w-[2px] bg-rose-400/60 dark:bg-rose-500/40 z-10"
            aria-hidden="true"
          />

          {/* Notebook Punch Holes on the Margin Area */}
          <div
            className="pointer-events-none absolute top-8 left-1.5 sm:left-3 size-3 sm:size-3.5 rounded-full bg-canvas border border-slate-300/80 dark:border-slate-700 shadow-inner z-10"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 left-1.5 sm:left-3 size-3 sm:size-3.5 rounded-full bg-canvas border border-slate-300/80 dark:border-slate-700 shadow-inner z-10"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-8 left-1.5 sm:left-3 size-3 sm:size-3.5 rounded-full bg-canvas border border-slate-300/80 dark:border-slate-700 shadow-inner z-10"
            aria-hidden="true"
          />

          {/* Content Sections Area */}
          <div className="relative pl-9 pr-4 sm:pl-14 sm:pr-8 py-5 sm:py-6 space-y-5 sm:space-y-6 z-0">
            {!hasAnyContent && (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  {t(
                    "No classwork, homework, or answers recorded for this entry.",
                    "এই এন্ট্রির জন্য কোনো ক্লাসওয়ার্ক, হোমওয়ার্ক বা উত্তর রেকর্ড করা হয়নি।"
                  )}
                </p>
              </div>
            )}

            {/* 1. CLASSWORK (C.W) */}
            {hasCw && (
              <section className="space-y-0">
                <div className="flex items-center min-h-[2.25rem] border-b border-sky-100 dark:border-sky-900/40 py-1">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-950/70 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shadow-2xs">
                    <Pencil className="size-3 text-blue-600 dark:text-blue-400" />
                    <span>{t("Classwork (C.W)", "ক্লাসওয়ার্ক (C.W)")}</span>
                  </span>
                </div>
                <DiaryContentRenderer
                  content={entry.cw}
                  className="space-y-0"
                  blockClassName="min-h-[2.25rem] py-1.5 border-b border-sky-100 dark:border-sky-900/40 text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-100 font-medium"
                />
              </section>
            )}

            {/* 2. HOMEWORK (H.W) */}
            {hasHw && (
              <section className="space-y-0">
                <div className="flex items-center min-h-[2.25rem] border-b border-sky-100 dark:border-sky-900/40 py-1">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/70 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-2xs">
                    <BookOpen className="size-3 text-amber-600 dark:text-amber-400" />
                    <span>{t("Homework (H.W)", "হোমওয়ার্ক (H.W)")}</span>
                  </span>
                </div>
                <DiaryContentRenderer
                  content={entry.hw}
                  className="space-y-0"
                  blockClassName="min-h-[2.25rem] py-1.5 border-b border-sky-100 dark:border-sky-900/40 text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-100 font-medium"
                />
              </section>
            )}

            {/* 3. SCHOOL ANSWER */}
            {hasAnswer && (
              <section className="space-y-0">
                <div className="flex items-center min-h-[2.25rem] border-b border-sky-100 dark:border-sky-900/40 py-1">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                    <Sparkles className="size-3 text-emerald-600 dark:text-emerald-400" />
                    <span>{t("School Answer", "স্কুল উত্তর")}</span>
                  </span>
                </div>
                <DiaryContentRenderer
                  content={entry.answer}
                  className="space-y-0"
                  blockClassName="min-h-[2.25rem] py-1.5 border-b border-sky-100 dark:border-sky-900/40 text-sm sm:text-base leading-relaxed text-slate-900 dark:text-slate-50 font-medium"
                />
              </section>
            )}

            {/* 4. TEACHER'S ANSWER (OPTIONAL) */}
            {hasTeacherAnswer && (
              <section className="space-y-0">
                <div className="flex items-center min-h-[2.25rem] border-b border-sky-100 dark:border-sky-900/40 py-1">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs">
                    <CheckCircle2 className="size-3 text-indigo-600 dark:text-indigo-400" />
                    <span>{t("Teacher's Answer", "শিক্ষকের উত্তর")}</span>
                  </span>
                </div>
                <DiaryContentRenderer
                  content={entry.teacherAnswer}
                  className="space-y-0"
                  blockClassName="min-h-[2.25rem] py-1.5 border-b border-sky-100 dark:border-sky-900/40 text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-100 font-medium"
                />
              </section>
            )}

            {/* 5. EASY ANSWER (OPTIONAL) */}
            {hasEasyAnswer && (
              <section className="space-y-0">
                <div className="flex items-center min-h-[2.25rem] border-b border-sky-100 dark:border-sky-900/40 py-1">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 dark:bg-sky-950/70 px-2.5 py-0.5 text-xs font-bold text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 shadow-2xs">
                    <Lightbulb className="size-3 text-sky-600 dark:text-sky-400" />
                    <span>{t("Easy Answer", "সহজ উত্তর")}</span>
                  </span>
                </div>
                <DiaryContentRenderer
                  content={entry.easyAnswer}
                  className="space-y-0"
                  blockClassName="min-h-[2.25rem] py-1.5 border-b border-sky-100 dark:border-sky-900/40 text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-100 font-medium"
                />
              </section>
            )}

            {/* 6. BANGLA EXPLANATION (OPTIONAL) */}
            {hasBanglaExplanation && (
              <section className="space-y-0">
                <div className="flex items-center min-h-[2.25rem] border-b border-sky-100 dark:border-sky-900/40 py-1">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 dark:bg-teal-950/70 px-2.5 py-0.5 text-xs font-bold text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 shadow-2xs">
                    <MessageSquare className="size-3 text-teal-600 dark:text-teal-400" />
                    <span>{t("Bangla Explanation", "বাংলা ব্যাখ্যা")}</span>
                  </span>
                </div>
                <DiaryContentRenderer
                  content={entry.banglaExplanation}
                  className="space-y-0"
                  blockClassName="min-h-[2.25rem] py-1.5 border-b border-sky-100 dark:border-sky-900/40 text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-100 font-medium"
                />
              </section>
            )}

            {/* 7. REMARKS (OPTIONAL) */}
            {hasRemarks && (
              <section className="space-y-0">
                <div className="flex items-center min-h-[2.25rem] border-b border-sky-100 dark:border-sky-900/40 py-1">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 dark:bg-purple-950/70 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shadow-2xs">
                    <MessageSquare className="size-3 text-purple-600 dark:text-purple-400" />
                    <span>{t("Remarks", "মন্তব্য")}</span>
                  </span>
                </div>
                <DiaryContentRenderer
                  content={entry.remarks}
                  className="space-y-0"
                  blockClassName="min-h-[2.25rem] py-1.5 border-b border-sky-100 dark:border-sky-900/40 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300 font-medium"
                />
              </section>
            )}

            {/* 8. WORD MEANINGS / VOCABULARY (OPTIONAL) */}
            {hasWordMeanings && entry.wordMeanings && (
              <section className="space-y-2">
                <div className="flex items-center min-h-[2.25rem] border-b border-sky-100 dark:border-sky-900/40 py-1">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 dark:bg-rose-950/70 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-2xs">
                    <BookOpen className="size-3 text-rose-600 dark:text-rose-400" />
                    <span>{t("Word Meaning", "শব্দার্থ")}</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {entry.wordMeanings.map(({ word, meaning }, idx) => (
                    <div
                      key={`${word}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 px-3 py-2 text-xs sm:text-sm shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => gameAudio.speak(word)}
                        className="tap flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 hover:text-primary transition-colors text-left"
                        title={t("Listen pronunciation", "উচ্চারণ শুনুন")}
                      >
                        <Volume2 className="size-3.5 text-primary shrink-0" />
                        <span>{word}</span>
                      </button>
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        {meaning}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 9. PRONUNCIATION WORDS (OPTIONAL) */}
            {hasPronunciation && entry.pronunciation && (
              <section className="space-y-2">
                <div className="flex items-center min-h-[2.25rem] border-b border-sky-100 dark:border-sky-900/40 py-1">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-fuchsia-50 dark:bg-fuchsia-950/70 px-2.5 py-0.5 text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800/60 shadow-2xs">
                    <Volume2 className="size-3 text-fuchsia-600 dark:text-fuchsia-400" />
                    <span>{t("Pronunciation Practice", "উচ্চারণ অনুশীলন")}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {entry.pronunciation.map((word) => (
                    <button
                      key={word}
                      type="button"
                      onClick={() => gameAudio.speak(word)}
                      className="tap inline-flex items-center gap-1.5 rounded-full border border-fuchsia-200/80 dark:border-fuchsia-800/60 bg-fuchsia-50/50 dark:bg-slate-800/90 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 shadow-2xs transition-all hover:bg-fuchsia-100 dark:hover:bg-fuchsia-950/50 hover:border-fuchsia-300 active:scale-95"
                    >
                      <Volume2 className="size-3.5 text-fuchsia-600 dark:text-fuchsia-400" />
                      <span>{word}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 10. PRACTICE QUESTION (OPTIONAL) */}
            {hasPractice && entry.practice && (
              <section className="space-y-2">
                <div className="flex items-center min-h-[2.25rem] border-b border-sky-100 dark:border-sky-900/40 py-1">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-violet-50 dark:bg-violet-950/70 px-2.5 py-0.5 text-xs font-bold text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60 shadow-2xs">
                    <HelpCircle className="size-3 text-violet-600 dark:text-violet-400" />
                    <span>{t("Practice Question", "অনুশীলন প্রশ্ন")}</span>
                  </span>
                </div>
                <div className="space-y-2.5 pt-1">
                  <p className="min-h-[2.25rem] py-1.5 border-b border-sky-100 dark:border-sky-900/40 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                    {entry.practice.question}
                  </p>
                  {entry.practice.options && entry.practice.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {entry.practice.options.map((opt) => {
                        const isSelected = selectedPracticeOption === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setSelectedPracticeOption(opt);
                              gameAudio.playPop();
                            }}
                            className={`tap rounded-xl border p-2.5 text-xs sm:text-sm font-bold transition-all text-left flex items-center justify-between ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary shadow-xs"
                                : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800"
                            }`}
                          >
                            <span>{opt}</span>
                            {isSelected && (
                              <CheckCircle2 className="size-4 text-primary shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Notebook Bottom Edge Footer */}
        <div className="border-t border-slate-200/70 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/60 px-4 sm:px-6 py-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          <span>{entry.subject}</span>
          <span>{formattedDate}</span>
        </div>
      </div>
    </PageShell>
  );
}

