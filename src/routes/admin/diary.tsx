import { createFileRoute } from "@tanstack/react-router";
import { Plus, Save, Trash2, Edit3, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import {
  parseDiaryText,
  todayKey,
  useSchoolContent,
  type DiaryEntry,
  getUniqueSubjects,
  normalizeSubject,
} from "@/lib/school-content";
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
  const {
    diary,
    routine,
    addDiary,
    addDiaryMany,
    updateDiary,
    removeDiary,
    renameSubjectGlobally,
    deleteSubjectGlobally,
  } = useSchoolContent();
  const [date, setDate] = useState(todayKey());
  const [draft, setDraft] = useState(empty);
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  // Subject rename & delete tool state
  const [showRenameSection, setShowRenameSection] = useState(false);
  const [oldSubjectToRename, setOldSubjectToRename] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [renameFeedback, setRenameFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const list = diary.filter((d) => d.date === date);
  const field =
    "w-full rounded-2xl border border-border bg-muted px-3 py-2 text-sm outline-none";

  // Active diary subjects with occurrence counts
  const activeDiarySubjects = useMemo(() => {
    const counts = new Map<string, number>();
    diary.forEach((d) => {
      if (d.subject && d.subject.trim()) {
        const norm = normalizeSubject(d.subject);
        counts.set(norm, (counts.get(norm) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [diary]);

  // Build unique, normalized subject suggestions dynamically from live diary & routine entries
  const subjectSuggestions = useMemo(() => {
    return getUniqueSubjects(diary, routine);
  }, [routine, diary]);

  const handleGlobalRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldSubjectToRename || !newSubjectName.trim()) return;
    setIsRenaming(true);
    setRenameFeedback(null);
    try {
      const res = await renameSubjectGlobally(oldSubjectToRename, newSubjectName.trim());
      setRenameFeedback({
        type: "success",
        message: t(
          `Successfully updated ${res.updatedCount} entry/entries to "${normalizeSubject(newSubjectName.trim())}"!`,
          `সফলভাবে ${res.updatedCount}টি এন্ট্রির নাম "${normalizeSubject(newSubjectName.trim())}" এ পরিবর্তন করা হয়েছে!`,
        ),
      });
      setOldSubjectToRename("");
      setNewSubjectName("");
    } catch (err: any) {
      console.error("Failed to rename subject:", err);
      setRenameFeedback({
        type: "error",
        message: t(
          `Failed to rename subject across database: ${err?.message || "Permission or network error"}`,
          `ডাটাবেজে বিষয়টির নাম পরিবর্তন করতে ব্যর্থ হয়েছে: ${err?.message || "অনুমতি বা নেটওয়ার্ক ত্রুটি"}`,
        ),
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!oldSubjectToRename) return;
    const subjectName = oldSubjectToRename;
    const count =
      activeDiarySubjects.find(
        (s) => s.name.toLowerCase() === normalizeSubject(subjectName).toLowerCase(),
      )?.count || 0;

    const confirmed = window.confirm(
      t(
        `Are you sure you want to permanently delete "${subjectName}" and all its ${count} entry/entries from diary and routine? This action cannot be undone.`,
        `আপনি কি নিশ্চিত যে "${subjectName}" এবং এর অন্তর্ভুক্ত ${count}টি এন্ট্রি স্থায়ীভাবে ডায়েরি ও রুটিন থেকে মুছে ফেলতে চান? এটি পূর্বাবস্থায় ফেরানো যাবে না।`,
      ),
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setRenameFeedback(null);
    try {
      const res = await deleteSubjectGlobally(subjectName);
      setRenameFeedback({
        type: "success",
        message: t(
          `Successfully deleted "${subjectName}" (${res.deletedDiaryCount} diary entries and ${res.deletedRoutineCount} routine periods removed)!`,
          `"${subjectName}" সফলভাবে মুছে ফেলা হয়েছে (${res.deletedDiaryCount}টি ডায়েরি এন্ট্রি ও ${res.deletedRoutineCount}টি রুটিন পিরিয়ড অপসারিত)!`,
        ),
      });
      setOldSubjectToRename("");
      setNewSubjectName("");
    } catch (err: any) {
      console.error("Failed to delete subject:", err);
      setRenameFeedback({
        type: "error",
        message: t(
          `Failed to delete subject "${subjectName}" across database: ${err?.message || "Permission or network error"}`,
          `ডাটাবেজ থেকে "${subjectName}" মুছতে ব্যর্থ হয়েছে: ${err?.message || "অনুমতি বা নেটওয়ার্ক ত্রুটি"}`,
        ),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageShell
      title={t("School Diary", "স্কুল ডায়েরি")}
      subtitle={t("Add, edit & delete entries", "এন্ট্রি যোগ, সম্পাদনা ও মুছে ফেলা")}
      back="/admin"
    >
      <datalist id="admin-diary-subject-suggestions">
        {subjectSuggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* Global Subject Rename Tool */}
      <SectionCard
        title={t("Rename Subject Globally", "বিষয়সমূহের নাম সংশোধন ও একীকরণ")}
        hint={
          <button
            onClick={() => {
              setShowRenameSection((v) => !v);
              setRenameFeedback(null);
            }}
            className="flex items-center gap-1 text-xs font-bold text-primary"
          >
            <Edit3 className="size-3.5" />
            {showRenameSection ? t("Hide", "লুকান") : t("Manage Subjects", "বিষয় ব্যবস্থাপনা")}
          </button>
        }
      >
        <p className="text-xs text-muted-foreground mb-3">
          {t(
            "Quickly fix misspelled subjects or rename a subject across all past diary records in one click.",
            "বানান ভুল ঠিক করুন অথবা এক ক্লিকে অতীতের সমস্ত ডায়েরি রেকর্ডে যেকোনো বিষয়ের নাম সংশোধন করুন।",
          )}
        </p>

        {showRenameSection && (
          <div className="space-y-4 pt-1 border-t border-border">
            {/* Active Subjects in Diary with entry counts */}
            {activeDiarySubjects.length > 0 && (
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                  {t("Subjects in Diary (click to edit):", "ডায়েরিতে ব্যবহৃত বিষয়সমূহ (এডিট করতে ক্লিক করুন):")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {activeDiarySubjects.map(({ name, count }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setOldSubjectToRename(name);
                        setNewSubjectName(name);
                        setRenameFeedback(null);
                      }}
                      className={`tap inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                        oldSubjectToRename === name
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      <span>{name}</span>
                      <span className="rounded-full bg-black/10 dark:bg-white/15 px-1.5 py-0.2 text-[10px] font-bold">
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleGlobalRename} className="space-y-3 bg-muted/60 p-3 rounded-2xl border border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">
                    {t("Subject to Change (Old)", "পরিবর্তনযোগ্য বিষয় (পুরাতন)")}
                  </label>
                  <select
                    value={oldSubjectToRename}
                    onChange={(e) => {
                      setOldSubjectToRename(e.target.value);
                      if (!newSubjectName) setNewSubjectName(e.target.value);
                    }}
                    className={field}
                  >
                    <option value="">{t("-- Select Subject to Rename --", "-- পরিবর্তনের বিষয় নির্বাচন করুন --")}</option>
                    {activeDiarySubjects.map(({ name, count }) => (
                      <option key={name} value={name}>
                        {name} ({count} {t("entries", "টি এন্ট্রি")})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">
                    {t("New Subject Name", "নতুন বা সংশোধিত নাম")}
                  </label>
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder={t("e.g. English Language", "যেমন: English Language")}
                    list="admin-diary-subject-suggestions"
                    className={field}
                  />
                </div>
              </div>

              {renameFeedback && (
                <div
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium ${
                    renameFeedback.type === "success"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  {renameFeedback.type === "success" ? (
                    <CheckCircle2 className="size-4 shrink-0" />
                  ) : (
                    <AlertCircle className="size-4 shrink-0" />
                  )}
                  <span>{renameFeedback.message}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={isRenaming || isDeleting || !oldSubjectToRename || !newSubjectName.trim()}
                  className="tap flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRenaming ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      {t("Updating all records...", "সকল রেকর্ড আপডেট হচ্ছে...")}
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5" />
                      {t("Update All Matching Entries in Database", "ডাটাবেজে সকল ম্যাচিং এন্ট্রি আপডেট করুন")}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSubject}
                  disabled={isRenaming || isDeleting || !oldSubjectToRename}
                  className="tap flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50 dark:hover:bg-rose-950/50 px-4 py-2.5 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      {t("Deleting...", "মুছে ফেলা হচ্ছে...")}
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-3.5" />
                      {t("Delete Subject", "বিষয়টি মুছুন")}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </SectionCard>

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
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const subject = normalizeSubject(draft.subject) || draft.subject.trim();
            if (!subject) return;
            addDiary({ ...draft, subject, date });
            setDraft(empty);
          }}
        >
          <div>
            <label className="text-xs font-bold text-muted-foreground">{t("Subject", "বিষয়")}</label>
            <div className="mt-1">
              <input
                type="text"
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                placeholder={t("Enter or select subject (e.g. English Language)", "বিষয় লিখুন বা নির্বাচন করুন (যেমন: English Language)")}
                list="admin-diary-subject-suggestions"
                className={field}
                autoComplete="off"
              />
            </div>
            {/* Quick-pick subject chips derived dynamically from database */}
            {subjectSuggestions.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {subjectSuggestions.slice(0, 8).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setDraft({ ...draft, subject: sub })}
                    className={`tap rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors ${
                      draft.subject === sub
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}
          </div>
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
              <DiaryRow
                key={d.id}
                entry={d}
                onSave={updateDiary}
                onDelete={removeDiary}
                field={field}
              />
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

  useEffect(() => {
    setForm(entry);
  }, [entry]);

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
    <li className="space-y-3 rounded-2xl bg-muted p-3">
      <div>
        <label className="text-xs font-bold text-muted-foreground">{t("Subject", "বিষয়")}</label>
        <div className="mt-1">
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder={t("Subject", "বিষয়")}
            list="admin-diary-subject-suggestions"
            className={field}
            autoComplete="off"
          />
        </div>
      </div>
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
            const subject = normalizeSubject(form.subject) || form.subject.trim();
            onSave(entry.id, { ...form, subject });
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
