import { createFileRoute } from "@tanstack/react-router";
import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { calculateDaysRemaining, formatDaysRemaining, todayKey, useSchoolContent, type ExamEntry } from "@/lib/school-content";
import { useAccess } from "@/lib/access-store";

export const Route = createFileRoute("/admin/exams")({
  head: () => ({
    meta: [
      { title: "Exams — Wafi Admin" },
      { name: "description", content: "Add, edit and delete exams that students see on the dashboard and planner." },
      { property: "og:title", content: "Exams — Wafi Admin" },
      { property: "og:description", content: "Manage upcoming exams with dates and chapters." },
    ],
  }),
  component: AdminExams,
});

const empty = { name: "", date: todayKey(), chapter: "", description: "" };

function AdminExams() {
  const { t } = useApp();
  const { currentUser } = useAccess();
  const isAdmin = currentUser?.role === "admin";
  const { exams, addExam, updateExam, removeExam } = useSchoolContent();
  const [draft, setDraft] = useState(empty);

  const field = "w-full rounded-2xl border border-border bg-muted px-3 py-2 text-sm outline-none";

  return (
    <PageShell
      title={t("Exams", "পরীক্ষা")}
      subtitle={t("Add, edit & delete exams", "পরীক্ষা যোগ, সম্পাদনা ও মুছে ফেলা")}
      back="/admin"
    >
      <SectionCard title={t("Add exam", "নতুন পরীক্ষা")}>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.name.trim()) return;
            addExam({ name: draft.name, date: draft.date, chapter: draft.chapter, description: draft.description });
            setDraft(empty);
          }}
        >
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder={t("Exam name", "পরীক্ষার নাম")}
            className={field}
          />
          <input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            className={field}
          />
          <input
            value={draft.chapter}
            onChange={(e) => setDraft({ ...draft, chapter: e.target.value })}
            placeholder={t("Chapter/Topic", "অধ্যায়/বিষয়")}
            className={field}
          />
          <input
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder={t("Description (optional)", "বিবরণ (ঐচ্ছিক)")}
            className={field}
          />
          <button
            type="submit"
            className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            <Plus className="size-4" />
            {t("Add exam", "পরীক্ষা যোগ করুন")}
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title={t("Exams", "পরীক্ষা")}
        hint={<Pill tone="primary">{exams.length}</Pill>}
      >
        {exams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("No exams added yet.", "এখনো কোনো পরীক্ষা যোগ করা হয়নি।")}
          </p>
        ) : (
          <ul className="space-y-3">
            {exams.map((exam) => (
              <ExamRow key={exam.id} entry={exam} onSave={updateExam} onDelete={removeExam} field={field} />
            ))}
          </ul>
        )}
      </SectionCard>
    </PageShell>
  );
}

function ExamRow({
  entry,
  onSave,
  onDelete,
  field,
}: {
  entry: ExamEntry;
  onSave: (id: string, patch: Partial<ExamEntry>) => void;
  onDelete: (id: string) => void;
  field: string;
}) {
  const { t } = useApp();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(entry);
  const daysRemaining = calculateDaysRemaining(entry.date);
  const daysDisplay = formatDaysRemaining(daysRemaining);

  if (!edit) {
    return (
      <li className="rounded-2xl bg-muted p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{entry.name}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{entry.date}</p>
            <p className="mt-1 text-xs">{entry.chapter}</p>
            {entry.description && <p className="mt-1 text-xs text-muted-foreground italic">{entry.description}</p>}
            <p className="mt-2 text-sm font-extrabold text-destructive">{daysDisplay}</p>
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
            aria-label="Delete exam"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded-2xl bg-muted p-3">
      <input
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Exam name"
        className={field}
      />
      <input
        type="date"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
        className={field}
      />
      <input
        value={form.chapter}
        onChange={(e) => setForm({ ...form, chapter: e.target.value })}
        placeholder="Chapter/Topic"
        className={field}
      />
      <input
        value={form.description || ""}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Description (optional)"
        className={field}
      />
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
