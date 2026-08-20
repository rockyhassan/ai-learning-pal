import { createFileRoute } from "@tanstack/react-router";
import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import {
  sortRoutine,
  todayWeekday,
  useSchoolContent,
  weekdays,
  type RoutineEntry,
  type Weekday,
} from "@/lib/school-content";
import { resolveCanonicalSubject, CANONICAL_SUBJECT_NAMES } from "@/lib/subjects";

export const Route = createFileRoute("/admin/routine")({
  head: () => ({
    meta: [
      { title: "Class Routine — Wafi Admin" },
      { name: "description", content: "Add, edit and delete class routine periods shown on the student planner." },
      { property: "og:title", content: "Class Routine — Wafi Admin" },
      { property: "og:description", content: "Day-wise periods, times and teachers." },
    ],
  }),
  component: AdminRoutine,
});

function AdminRoutine() {
  const { t } = useApp();
  const { routine, addRoutine, updateRoutine, removeRoutine } = useSchoolContent();
  const [day, setDay] = useState<Weekday>(todayWeekday());
  const [draft, setDraft] = useState({ start: "08:00", end: "08:35", subject: "", teacher: "" });

  const field = "w-full rounded-2xl border border-border bg-muted px-3 py-2 text-sm outline-none";
  const list = sortRoutine(routine.filter((r) => r.day === day));

  return (
    <PageShell
      title={t("Class Routine", "ক্লাস রুটিন")}
      subtitle={t("Add, edit & delete periods", "পিরিয়ড যোগ, সম্পাদনা ও মুছে ফেলা")}
      back="/admin"
    >
      <datalist id="routine-subject-options">
        {CANONICAL_SUBJECT_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <SectionCard>
        <div className="flex flex-wrap gap-2">
          {weekdays.map((d) => (
            <button
              key={d.key}
              onClick={() => setDay(d.key)}
              className={`tap rounded-full px-3 py-1.5 text-[11px] font-bold ${
                day === d.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t(d.en, d.bn)}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("Add class", "ক্লাস যোগ")}>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.subject.trim()) return;
            const subject = resolveCanonicalSubject(draft.subject);
            addRoutine({ ...draft, subject, day });
            setDraft({ ...draft, subject: "", teacher: "" });
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className={field} />
            <input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className={field} />
          </div>
          <input
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            placeholder={t("Subject (e.g. Mathematics, English Literature)", "বিষয় (যেমন: Mathematics, English Literature)")}
            list="routine-subject-options"
            className={field}
          />
          <input
            value={draft.teacher}
            onChange={(e) => setDraft({ ...draft, teacher: e.target.value })}
            placeholder={t("Teacher (optional)", "শিক্ষক (ঐচ্ছিক)")}
            className={field}
          />
          <button
            type="submit"
            className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            <Plus className="size-4" />
            {t("Add class", "ক্লাস যোগ")}
          </button>
        </form>
      </SectionCard>

      <SectionCard title={t("Periods", "পিরিয়ড")} hint={<Pill tone="primary">{list.length}</Pill>}>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No classes for this day.", "এই দিনে কোনো ক্লাস নেই।")}</p>
        ) : (
          <ul className="space-y-2">
            {list.map((r) => (
              <RoutineRow key={r.id} entry={r} onSave={updateRoutine} onDelete={removeRoutine} field={field} />
            ))}
          </ul>
        )}
      </SectionCard>
    </PageShell>
  );
}

function RoutineRow({
  entry,
  onSave,
  onDelete,
  field,
}: {
  entry: RoutineEntry;
  onSave: (id: string, patch: Partial<RoutineEntry>) => void;
  onDelete: (id: string) => void;
  field: string;
}) {
  const { t } = useApp();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(entry);

  if (!edit) {
    return (
      <li className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2.5">
        <span className="w-24 shrink-0 text-[11px] font-bold text-primary">
          {entry.start} – {entry.end}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{entry.subject}</p>
          <p className="text-[11px] text-muted-foreground">{entry.teacher || "—"}</p>
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
          aria-label="Delete class"
        >
          <Trash2 className="size-4" />
        </button>
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded-2xl bg-muted p-3">
      <div className="grid grid-cols-2 gap-2">
        <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={field} />
        <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={field} />
      </div>
      <input
        value={form.subject}
        onChange={(e) => setForm({ ...form, subject: e.target.value })}
        list="routine-subject-options"
        className={field}
      />
      <input
        value={form.teacher}
        onChange={(e) => setForm({ ...form, teacher: e.target.value })}
        placeholder={t("Teacher", "শিক্ষক")}
        className={field}
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            const subject = resolveCanonicalSubject(form.subject);
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
