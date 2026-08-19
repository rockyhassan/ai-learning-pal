import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Save, Volume2 } from "lucide-react";
import { useState } from "react";
import { PageShell, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { useSchoolContent, type DiaryEntry, getUniqueSubjects, normalizeSubject } from "@/lib/school-content";
import { useAccess } from "@/lib/access-store";
import { DiaryContentEditor } from "@/components/DiaryContentEditor";
import { RichTextDisplay } from "@/components/RichTextDisplay";

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
      // Support both → and ->
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
        
        // Support both → and ->
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

// Helper: Render School Answer with notebook-style ruled background
// Preserves original text structure and line breaks exactly
function SchoolAnswerNotebook({ text }: { text: string }) {
  if (!text?.trim()) return null;

  return (
    <style>{`
      .notebook-ruled {
        /* Fixed line height for notebook rules */
        --line-height: 1.75rem;
        /* Light, subtle 1px ruled lines under text baseline */
        background-image: 
          repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent calc(var(--line-height) - 1px),
            #cbd5e1 calc(var(--line-height) - 1px),
            #cbd5e1 var(--line-height)
          );
        background-size: 100% var(--line-height);
        background-attachment: local;
        background-position: 0 calc(1rem + 0.5px);
      }
    `}
    </style>
  );
}

// Process text while preserving structure
function renderNotebookContent(text: string) {
  const lineHeightRem = 1.75;
  
  // Split by newlines and preserve all lines
  const lines = text.split("\n");
  
  return (
    <div className="space-y-0">
      {lines.map((line, idx) => (
        <div
          key={idx}
          style={{
            height: `${lineHeightRem}rem`,
            lineHeight: `${lineHeightRem}rem`,
          }}
          className="whitespace-pre-wrap break-words text-sm font-medium text-foreground overflow-hidden"
        >
          {line || "\u00A0"} {/* Non-breaking space for empty lines */}
        </div>
      ))}
    </div>
  );
}

function DiaryDetail() {
  const { diaryId } = Route.useParams();
  const { t } = useApp();
  const { currentUser } = useAccess();
  const { diary, routine, updateDiary } = useSchoolContent();
  const entry = diary.find((d) => d.id === diaryId);
  const isAdmin = currentUser?.role === "admin";

  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<DiaryEntry | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!entry) {
    return (
      <PageShell title={t("Diary Entry", "ডায়েরি এন্ট্রি")} subtitle={t("Not found", "খুঁজে পাওয়া যায়নি")} back="/homework">
        <p className="text-sm text-muted-foreground">
          {t("This diary entry could not be found.", "এই ডায়েরি এন্ট্রি খুঁজে পাওয়া যায়নি।")}
        </p>
      </PageShell>
    );
  }

  const field =
    "w-full rounded-2xl border border-border bg-muted px-3 py-2 text-sm outline-none";

  if (edit && form) {
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
          <textarea
            value={form.cw}
            onChange={(e) => setForm({ ...form, cw: e.target.value })}
            placeholder={t("Enter classwork details", "ক্লাসওয়ার্কের বিবরণ লিখুন")}
            rows={2}
            className={field}
          />
        </SectionCard>

        <SectionCard title={t("Homework", "হোমওয়ার্ক")}>
          <textarea
            value={form.hw}
            onChange={(e) => setForm({ ...form, hw: e.target.value })}
            placeholder={t("Enter homework details", "হোমওয়ার্কের বিবরণ লিখুন")}
            rows={2}
            className={field}
          />
        </SectionCard>

        <SectionCard title={t("Remarks (optional)", "মন্তব্য (ঐচ্ছিক)")}>
          <textarea
            value={form.remarks || ""}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            placeholder={t("Enter remarks or notes", "মন্তব্য বা নোট লিখুন")}
            rows={2}
            className={field}
          />
        </SectionCard>

        <SectionCard title={t("School Answer", "স্কুল উত্তর")}>
          <div>
            <label className="text-xs font-bold text-muted-foreground">{t("Answers", "উত্তর")}</label>
            <div className="mt-1">
              <DiaryContentEditor
                value={form.answer}
                onChange={(value) => setForm({ ...form, answer: value })}
                placeholder={t("Write or format your answer...", "আপনার উত্তর লিখুন বা ফরম্যাট করুন...")}
                rows={3}
              />
            </div>
          </div>
        </SectionCard>

        {form.hw?.trim() && (
          <>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="tap mt-2 flex w-full items-center justify-between rounded-2xl bg-card px-3 py-2 text-sm font-bold text-primary border border-border"
            >
              <span>{t("Advanced Homework Content", "উন্নত হোমওয়ার্ক সামগ্রী")}</span>
              {showAdvanced ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {showAdvanced && (
              <SectionCard>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground">
                      {t("Teacher's Answer", "শিক্ষকের উত্তর")}
                    </label>
                    <div className="mt-1">
                      <DiaryContentEditor
                        value={form.teacherAnswer ?? ""}
                        onChange={(e) => setForm({ ...form, teacherAnswer: e || undefined })}
                        placeholder={t("Teacher's answer / solution", "শিক্ষকের উত্তর / সমাধান")}
                        rows={2}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground">
                      {t("Easy Answer", "সহজ উত্তর")}
                    </label>
                    <div className="mt-1">
                      <DiaryContentEditor
                        value={form.easyAnswer ?? ""}
                        onChange={(e) => setForm({ ...form, easyAnswer: e || undefined })}
                        placeholder={t("Simplified version of the answer", "উত্তরের সরল সংস্করণ")}
                        rows={2}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground">
                      {t("Bangla Explanation", "বাংলা ব্যাখ্যা")}
                    </label>
                    <div className="mt-1">
                      <DiaryContentEditor
                        value={form.banglaExplanation ?? ""}
                        onChange={(e) => setForm({ ...form, banglaExplanation: e || undefined })}
                        placeholder={t("Explanation in Bangla", "বাংলায় ব্যাখ্যা")}
                        rows={2}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground">
                      {t("Pronunciation", "উচ্চারণ")} {t("(comma-separated)", "(কমা দ্বারা বিভক্ত)")}
                    </label>
                    <input
                      value={serializePronunciation(form.pronunciation)}
                      onChange={(e) =>
                        setForm({ ...form, pronunciation: parsePronunciation(e.target.value) || undefined })
                      }
                      placeholder={t("Example: family, teaches, happily", "উদাহরণ: family, teaches, happily")}
                      className={`mt-1 ${field}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground">
                      {t("Word Meanings", "শব্দার্থ")} {t("(word → meaning, one per line)", "(শব্দ → অর্থ, এক লাইনে একটি)")}
                    </label>
                    <div className="mt-1">
                      <DiaryContentEditor
                        value={wordMeaningsToBlocks(form.wordMeanings)}
                        onChange={(jsonString) => {
                          const wordMeanings = blocksToWordMeanings(jsonString);
                          setForm({ ...form, wordMeanings: wordMeanings || undefined });
                        }}
                        placeholder={t("Example: members → সদস্য", "উদাহরণ: members → সদস্য")}
                        rows={3}
                      />
                    </div>
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
            )}
          </>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => {
              const patch: Partial<DiaryEntry> = {
                subject: normalizeSubject(form.subject) || form.subject.trim(),
                cw: form.cw,
                hw: form.hw,
                remarks: form.remarks || "",
                answer: form.answer,
                ...(form.teacherAnswer?.trim() && { teacherAnswer: form.teacherAnswer.trim() }),
                ...(form.easyAnswer?.trim() && { easyAnswer: form.easyAnswer.trim() }),
                ...(form.banglaExplanation?.trim() && { banglaExplanation: form.banglaExplanation.trim() }),
                ...(form.pronunciation?.length && { pronunciation: form.pronunciation }),
                ...(form.wordMeanings?.length && { wordMeanings: form.wordMeanings }),
                ...(form.practice?.question && { practice: form.practice }),
              };
              updateDiary(entry.id, patch);
              setEdit(false);
            }}
            className="tap flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
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

  return (
    <PageShell
      title={entry.subject}
      subtitle={entry.date}
      back="/homework"
      action={
        isAdmin && !edit ? (
          <button
            onClick={() => {
              setForm(entry);
              setEdit(true);
            }}
            className="tap rounded-xl bg-primary/12 px-3 py-1.5 text-xs font-bold text-primary"
          >
            {t("Edit", "এডিট")}
          </button>
        ) : undefined
      }
    >
      <SectionCard title={t("Classwork", "ক্লাসওয়ার্ক")}>
        <p className="text-sm leading-relaxed">
          {entry.cw || t("No classwork recorded", "কোনো ক্লাসওয়ার্ক রেকর্ড করা হয়নি")}
        </p>
      </SectionCard>

      <SectionCard title={t("Homework", "হোমওয়ার্ক")}>
        <p className="text-sm leading-relaxed">
          {entry.hw || t("No homework assigned", "কোনো হোমওয়ার্ক দেওয়া হয়নি")}
        </p>
      </SectionCard>

      {entry.remarks && (
        <SectionCard title={t("Remarks", "মন্তব্য")}>
          <div className="flex items-start gap-2">
            <span className="inline-flex items-center shrink-0 rounded bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700 border border-purple-100/80">
              {t("Remarks", "মন্তব্য")}
            </span>
            <p className="text-sm leading-relaxed text-slate-700 font-medium">
              {entry.remarks}
            </p>
          </div>
        </SectionCard>
      )}

      {entry.answer && (
        <SectionCard title={t("School Answer", "স্কুল উত্তর")}>
          <SchoolAnswerNotebook text={entry.answer} />
          <div 
            className="notebook-ruled p-4 rounded-xl border border-border"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  to bottom,
                  transparent 0,
                  transparent 27px,
                  #cbd5e1 27px,
                  #cbd5e1 28px
                )
              `,
              backgroundSize: '100% 28px',
              backgroundAttachment: 'local',
              backgroundPosition: '0 calc(1rem + 0.5px)',
            }}
          >
            <RichTextDisplay content={entry.answer} className="text-sm" />
          </div>
        </SectionCard>
      )}

      {entry.teacherAnswer && (
        <SectionCard title={t("Teacher's Answer", "শিক্ষকের উত্তর")}>
          <p className="text-sm leading-relaxed">{entry.teacherAnswer}</p>
        </SectionCard>
      )}

      {entry.easyAnswer && (
        <SectionCard title={t("Easy Answer", "সহজ উত্তর")}>
          <p className="text-sm leading-relaxed">{entry.easyAnswer}</p>
        </SectionCard>
      )}

      {entry.banglaExplanation && (
        <SectionCard title={t("Bangla Explanation", "বাংলা ব্যাখ্যা")}>
          <p className="text-sm leading-relaxed">{entry.banglaExplanation}</p>
        </SectionCard>
      )}

      {entry.pronunciation && entry.pronunciation.length > 0 && (
        <SectionCard title={t("Pronunciation", "উচ্চারণ")}>
          <div className="flex flex-wrap gap-2">
            {entry.pronunciation.map((w) => (
              <button key={w} className="tap inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-2 text-sm font-semibold">
                <Volume2 className="size-3.5 text-primary" /> {w}
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {entry.wordMeanings && entry.wordMeanings.length > 0 && (
        <SectionCard title={t("Word Meaning", "শব্দার্থ")}>
          <ul className="space-y-1.5 text-sm">
            {entry.wordMeanings.map(({ word, meaning }) => (
              <li key={word} className="flex justify-between border-b border-border pb-1.5 last:border-0">
                <span className="font-semibold">{word}</span>
                <span className="text-muted-foreground">{meaning}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {entry.practice && (
        <SectionCard title={t("Practice", "অনুশীলন")}>
          <p className="mb-2 text-sm">{entry.practice.question}</p>
          {entry.practice.options.length > 0 && (
            <div className="flex gap-2">
              {entry.practice.options.map((o) => (
                <button key={o} className="tap flex-1 rounded-2xl border border-border bg-muted py-2 text-xs font-bold">
                  {o}
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </PageShell>
  );
}
