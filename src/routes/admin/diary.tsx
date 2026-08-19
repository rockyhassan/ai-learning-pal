import { createFileRoute } from "@tanstack/react-router";
import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { parseDiaryText, todayKey, useSchoolContent, type DiaryEntry } from "@/lib/school-content";
import { useAccess } from "@/lib/access-store";
import { DiaryContentEditor } from "@/components/DiaryContentEditor";

export const Route = createFileRoute("/admin/diary")({
  head: () => ({
    meta: [
      { title: "School Diary — Wafi Admin" },
      { name: "description", content: "Add, paste, edit and delete school diary entries that students see." },
      { property: "og:title", content: "School Diary — Wafi Admin" },
      { property: "og:description", content: "Manage C.W, H.W and answers for every subject." },
    ],
  }),
  component: AdminDiary,
});

const empty = { subject: "", cw: "", hw: "", remarks: "", answer: "" };

function AdminDiary() {
  const { t } = useApp();
  const { currentUser } = useAccess();
  const isAdmin = currentUser?.role === "admin";
  const { diary, addDiary, addDiaryMany, updateDiary, removeDiary } = useSchoolContent();
  const [date, setDate] = useState(todayKey());
  const [draft, setDraft] = useState(empty);
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  const list = diary.filter((d) => d.date === date);
  const field =
    "w-full rounded-2xl border border-border bg-muted px-3 py-2 text-sm outline-none";

  return (
    <PageShell
      title={t("School Diary", "স্কুল ডায়েরি")}
      subtitle={t("Add, edit & delete entries", "এন্ট্রি যোগ, সম্পাদনা ও মুছে ফেলা")}
      back="/admin"
    >
      <SectionCard>
        <label className="text-xs font-bold text-muted-foreground">{t("Date", "তারিখ")}</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`mt-1 ${field}`}
        />
      </SectionCard>

      <SectionCard
        title={t("Add entry", "নতুন এন্ট্রি")}
        hint={
          <button onClick={() => setShowPaste((v) => !v)} className="text-xs font-bold text-primary">
            {t("Paste Text", "টেক্সট পেস্ট")}
          </button>
        }
      >
        {showPaste ? (
          <div className="mb-3 space-y-2">
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={5}
              placeholder={t(
                "One line per subject:\nMaths | Ex 2.5 pg 26 | Pg 26 (5,6) | Bring compass\n\nOr multi-line:\nMaths\nC.W: Chapter 1 done\nH.W: Page 10\nRemarks: Bring scale",
                "প্রতি লাইনে এক বিষয়:\nMaths | Ex 2.5 pg 26 | Pg 26 (5,6) | মন্তব্য",
              )}
              className={`${field} font-mono text-xs`}
            />
            <button
              onClick={() => {
                const parsed = parseDiaryText(paste, date);
                if (parsed.length) addDiaryMany(parsed);
                setPaste("");
                setShowPaste(false);
              }}
              className="tap w-full rounded-2xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
            >
              {t("Parse & add", "পার্স করে যোগ করুন")}
            </button>
          </div>
        ) : null}

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.subject.trim()) return;
            addDiary({ ...draft, date });
            setDraft(empty);
          }}
        >
          <input
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            placeholder={t("Subject", "বিষয়")}
            className={field}
          />
          <div>
            <label className="text-xs font-bold text-muted-foreground">C.W (Classwork)</label>
            <div className="mt-1">
              <DiaryContentEditor
                value={draft.cw}
                onChange={(value) => setDraft({ ...draft, cw: value })}
                placeholder={t("Enter classwork details...", "ক্লাসওয়ার্কের বিবরণ লিখুন...")}
                rows={2}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">H.W (Homework)</label>
            <div className="mt-1">
              <DiaryContentEditor
                value={draft.hw}
                onChange={(value) => setDraft({ ...draft, hw: value })}
                placeholder={t("Enter homework details...", "হোমওয়ার্কের বিবরণ লিখুন...")}
                rows={2}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">{t("Remarks (optional)", "মন্তব্য (ঐচ্ছিক)")}</label>
            <div className="mt-1">
              <DiaryContentEditor
                value={draft.remarks || ""}
                onChange={(value) => setDraft({ ...draft, remarks: value })}
                placeholder={t("Enter remarks or notes...", "মন্তব্য বা নোট লিখুন...")}
                rows={2}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">{t("Answers (optional)", "উত্তর (ঐচ্ছিক)")}</label>
            <div className="mt-1">
              <DiaryContentEditor
                value={draft.answer}
                onChange={(value) => setDraft({ ...draft, answer: value })}
                placeholder={t("Write or format your answer...", "আপনার উত্তর লিখুন বা ফরম্যাট করুন...")}
                rows={3}
              />
            </div>
          </div>
          <button
            type="submit"
            className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            <Plus className="size-4" />
            {t("Add entry", "এন্ট্রি যোগ")}
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title={t("Entries", "এন্ট্রিসমূহ")}
        hint={<Pill tone="primary">{list.length}</Pill>}
      >
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("No entries for this date.", "এই তারিখে কোনো এন্ট্রি নেই।")}
          </p>
        ) : (
          <ul className="space-y-3">
            {list.map((d) => (
              <DiaryRow key={d.id} entry={d} onSave={updateDiary} onDelete={removeDiary} field={field} />
            ))}
          </ul>
        )}
      </SectionCard>
    </PageShell>
  );
}

function DiaryRow({
  entry,
  onSave,
  onDelete,
  field,
}: {
  entry: DiaryEntry;
  onSave: (id: string, patch: Partial<DiaryEntry>) => void;
  onDelete: (id: string) => void;
  field: string;
}) {
  const { t } = useApp();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(entry);

  if (!edit) {
    return (
      <li className="rounded-2xl bg-muted p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{entry.subject}</p>
            <p className="mt-1 text-[11px] font-bold uppercase text-muted-foreground">C.W</p>
            <p className="text-xs">{entry.cw || "—"}</p>
            <p className="mt-1 text-[11px] font-bold uppercase text-muted-foreground">H.W</p>
            <p className="text-xs">{entry.hw || "—"}</p>
            {entry.remarks ? (
              <>
                <p className="mt-1 text-[11px] font-bold uppercase text-purple-600 dark:text-purple-400">{t("Remarks", "মন্তব্য")}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">{entry.remarks}</p>
              </>
            ) : null}
            {entry.answer ? <p className="mt-1 text-xs text-primary">{entry.answer}</p> : null}
          </div>
          <button
            onClick={() => {
              setForm(entry);
              setEdit(true);
            }}
            className="tap rounded-xl bg-card px-3 py-1.5 text-xs font-bold text-primary"
          >
            {t("Edit", "এডিট")}
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="tap grid size-8 place-items-center rounded-xl bg-destructive/12 text-destructive"
            aria-label="Delete entry"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded-2xl bg-muted p-3">
      <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={field} />
      <div>
        <label className="text-xs font-bold text-muted-foreground">C.W (Classwork)</label>
        <div className="mt-1">
          <DiaryContentEditor
            value={form.cw}
            onChange={(value) => setForm({ ...form, cw: value })}
            placeholder="Enter classwork details..."
            rows={2}
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-muted-foreground">H.W (Homework)</label>
        <div className="mt-1">
          <DiaryContentEditor
            value={form.hw}
            onChange={(value) => setForm({ ...form, hw: value })}
            placeholder="Enter homework details..."
            rows={2}
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-muted-foreground">{t("Remarks (optional)", "মন্তব্য (ঐচ্ছিক)")}</label>
        <div className="mt-1">
          <DiaryContentEditor
            value={form.remarks || ""}
            onChange={(value) => setForm({ ...form, remarks: value })}
            placeholder={t("Enter remarks or notes...", "মন্তব্য বা নোট লিখুন...")}
            rows={2}
          />
        </div>
      </div>
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
      <div className="flex gap-2">
        <button
          onClick={() => {
            onSave(entry.id, form);
            setEdit(false);
          }}
          className="tap flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
        >
          <Save className="size-4" />
          {t("Save", "সেভ")}
        </button>
        <button onClick={() => setEdit(false)} className="tap rounded-2xl bg-card px-4 text-sm font-bold">
          {t("Cancel", "বাতিল")}
        </button>
      </div>
    </li>
  );
}
