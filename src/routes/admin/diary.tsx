import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Save,
  Trash2,
  Edit3,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Check,
  Sparkles,
  Database,
  ArrowRight,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
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
import {
  MASTER_SUBJECTS,
  getSubjectSuggestions,
  getSubjectMeta,
  resolveCanonicalSubject,
  type CanonicalSubject,
} from "@/lib/subjects";
import {
  scanAndPreviewNormalization,
  executeDatabaseNormalization,
  type NormalizationScanResult,
  type NormalizationExecutionResult,
} from "@/lib/subject-migration";
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

interface SubjectComboboxProps {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

export function SubjectCombobox({
  value,
  onChange,
  suggestions = [],
  placeholder,
  className = "w-full rounded-2xl border border-border bg-muted px-3 py-2 text-sm outline-none",
}: SubjectComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Combine Master canonical subjects with dynamic custom suggestions
  const allAvailableSubjects = useMemo(() => {
    const map = new Map<string, { id: string; name: string; nameBn?: string; emoji: string }>();

    // Master subjects
    MASTER_SUBJECTS.forEach((sub) => {
      map.set(sub.name.toLowerCase(), {
        id: sub.id,
        name: sub.name,
        nameBn: sub.nameBn,
        emoji: sub.emoji,
      });
    });

    // Custom subjects from database
    suggestions.forEach((customName) => {
      if (customName && !map.has(customName.toLowerCase())) {
        const meta = getSubjectMeta(customName);
        map.set(customName.toLowerCase(), {
          id: customName.toLowerCase().replace(/\s+/g, "-"),
          name: customName,
          emoji: meta.emoji,
        });
      }
    });

    return Array.from(map.values());
  }, [suggestions]);

  // Dynamic matching using master subjects registry & rich aliases
  const filtered = useMemo(() => {
    const trimmed = (value || "").trim().toLowerCase();
    if (!trimmed) {
      return allAvailableSubjects;
    }

    // Check if the current value is an exact match for one of the subjects
    const exactMatch = allAvailableSubjects.some(
      (s) => s.name.toLowerCase() === trimmed
    );

    // If exact match (e.g. reopened dropdown with existing subject), show all options
    if (exactMatch && open) {
      return allAvailableSubjects;
    }

    // Otherwise filter by name, Bengali name, or aliases
    const canonicalMatches = getSubjectSuggestions(trimmed);
    const canonicalNames = new Set(canonicalMatches.map((m) => m.name.toLowerCase()));

    return allAvailableSubjects.filter(
      (s) =>
        s.name.toLowerCase().includes(trimmed) ||
        (s.nameBn && s.nameBn.includes(trimmed)) ||
        canonicalNames.has(s.name.toLowerCase())
    );
  }, [value, allAvailableSubjects, open]);

  const handleSelect = (subjectName: string) => {
    onChange(subjectName);
    setOpen(false);
    setHighlightedIndex(-1);
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightedIndex(filtered.length - 1);
      } else {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        );
      }
    } else if (e.key === "Enter") {
      if (open && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        e.preventDefault();
        handleSelect(filtered[highlightedIndex].name);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === "Tab") {
      setOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Ensure highlighted item scrolls into view
  useEffect(() => {
    if (open && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightedIndex]) {
        (items[highlightedIndex] as HTMLElement).scrollIntoView({
          block: "nearest",
        });
      }
    }
  }, [highlightedIndex, open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          value={value || ""}
          onChange={(e) => {
            onChange(e.target.value);
            if (!open) setOpen(true);
            setHighlightedIndex(-1);
          }}
          onClick={() => {
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${className} pr-9`}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setOpen((prev) => !prev);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-transform cursor-pointer"
          aria-label="Toggle subject dropdown"
        >
          <ChevronDown
            className={`size-4 transition-transform duration-200 ${open ? "rotate-180 text-primary" : ""}`}
          />
        </button>
      </div>

      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 shadow-xl"
        >
          {filtered.map((s, index) => {
            const isSelected = (value || "").trim().toLowerCase() === s.name.toLowerCase();
            const isHighlighted = highlightedIndex === index;
            return (
              <li key={s.id} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(s.name);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`tap flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : isHighlighted
                      ? "bg-muted text-foreground"
                      : "text-popover-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{s.emoji}</span>
                    <span className="font-bold">{s.name}</span>
                    {s.nameBn && (
                      <span className="text-[11px] opacity-75 font-normal">({s.nameBn})</span>
                    )}
                  </div>
                  {isSelected && <Check className="size-3.5 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

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

  // Database migration / normalization tool state
  const [isScanning, setIsScanning] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [scanResult, setScanResult] = useState<NormalizationScanResult | null>(null);
  const [normResult, setNormResult] = useState<NormalizationExecutionResult | null>(null);

  const list = diary.filter((d) => d.date === date);
  const field =
    "w-full rounded-2xl border border-border bg-muted px-3 py-2 text-sm outline-none";

  // Active diary subjects with occurrence counts
  const activeDiarySubjects = useMemo(() => {
    const counts = new Map<string, number>();
    diary.forEach((d) => {
      if (d.subject && d.subject.trim()) {
        const norm = resolveCanonicalSubject(d.subject);
        counts.set(norm, (counts.get(norm) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [diary]);

  // Unique subject suggestions (canonical + active)
  const subjectSuggestions = useMemo(() => {
    return getUniqueSubjects(diary, routine);
  }, [routine, diary]);

  const handleGlobalRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldSubjectToRename || !newSubjectName.trim()) return;
    setIsRenaming(true);
    setRenameFeedback(null);
    try {
      const canonicalTarget = resolveCanonicalSubject(newSubjectName.trim());
      const res = await renameSubjectGlobally(oldSubjectToRename, canonicalTarget);
      setRenameFeedback({
        type: "success",
        message: t(
          `Successfully updated ${res.updatedCount} entry/entries to "${canonicalTarget}"!`,
          `সফলভাবে ${res.updatedCount}টি এন্ট্রির নাম "${canonicalTarget}" এ পরিবর্তন করা হয়েছে!`,
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
        (s) => s.name.toLowerCase() === resolveCanonicalSubject(subjectName).toLowerCase(),
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

  // Run database scan
  const handleScanDatabase = async () => {
    setIsScanning(true);
    setNormResult(null);
    try {
      const report = await scanAndPreviewNormalization();
      setScanResult(report);
    } catch (err) {
      console.error("Scan database failed:", err);
    } finally {
      setIsScanning(false);
    }
  };

  // Run database execution
  const handleExecuteNormalization = async () => {
    setIsNormalizing(true);
    try {
      const res = await executeDatabaseNormalization();
      setNormResult(res);
      setScanResult(null);
    } catch (err) {
      console.error("Execute normalization failed:", err);
    } finally {
      setIsNormalizing(false);
    }
  };

  return (
    <PageShell
      title={t("School Diary", "স্কুল ডায়েরি")}
      subtitle={t("Add, edit & delete entries", "এন্ট্রি যোগ, সম্পাদনা ও মুছে ফেলা")}
      back="/admin"
    >
      {/* Subject Management & Normalization Tool */}
      <SectionCard
        title={t("Subject Management & Normalization", "বিষয় ব্যবস্থাপনা ও ডাটাবেজ একীকরণ")}
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
            "Manage canonical subjects, fix misspelled records across the database, or run automated normalization.",
            "মাস্টার বিষয় ব্যবস্থাপনা করুন, ডাটাবেজে বানান ভুল সংশোধন করুন এবং এক ক্লিকে সম্পূর্ণ ডাটাবেজ একীকরণ করুন।",
          )}
        </p>

        {showRenameSection && (
          <div className="space-y-5 pt-1 border-t border-border">
            {/* Database One-Click Normalization Tool */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="size-4 text-primary" />
                  <h4 className="text-xs font-bold text-foreground">
                    {t("One-Click Database Normalizer", "এক ক্লিকে সম্পূর্ণ ডাটাবেজ একীকরণ")}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleScanDatabase}
                  disabled={isScanning || isNormalizing}
                  className="tap inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="size-3 animate-spin" />
                      {t("Scanning...", "স্ক্যান হচ্ছে...")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3" />
                      {t("Scan Database", "ডাটাবেজ স্ক্যান করুন")}
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-muted-foreground">
                {t(
                  "Scans all Firestore diary & routine documents and automatically fixes legacy variations (e.g. 'Mathematics' → 'Maths', 'CS' → 'ICT').",
                  "সকল ডায়েরি ও রুটিন রেকর্ড পরীক্ষা করে স্বয়ংক্রিয়ভাবে পুরনো নাম ও ভেরিয়েশন সংশোধন করে (যেমন: 'Mathematics' → 'Maths', 'CS' → 'ICT')।",
                )}
              </p>

              {/* Scan Preview Diff Table */}
              {scanResult && (
                <div className="mt-2 space-y-2 rounded-xl bg-background p-3 border border-border">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>
                      {t(
                        `Scan Summary: ${scanResult.totalDiaryDocs} diary, ${scanResult.totalRoutineDocs} routine records.`,
                        `স্ক্যান সারাংশ: ${scanResult.totalDiaryDocs}টি ডায়েরি, ${scanResult.totalRoutineDocs}টি রুটিন রেকর্ড।`,
                      )}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        scanResult.isClean
                          ? "bg-emerald-500/10 text-emerald-600 font-bold"
                          : "bg-amber-500/10 text-amber-600 font-bold"
                      }`}
                    >
                      {scanResult.isClean
                        ? t("100% Normalized & Clean", "১০০% একীকৃত ও নির্ভুল")
                        : t(`${scanResult.changes.length} subject variations to fix`, `${scanResult.changes.length}টি পরিবর্তন আবশ্যক`)}
                    </span>
                  </div>

                  {scanResult.changes.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                        {scanResult.changes.map((c) => (
                          <div
                            key={`${c.from}-${c.to}`}
                            className="flex items-center justify-between rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-rose-600 dark:text-rose-400 line-through">
                                {c.from}
                              </span>
                              <ArrowRight className="size-3 text-muted-foreground" />
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {c.to}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              {c.totalCount} {t("records", "টি")} ({c.diaryCount} diary, {c.routineCount} routine)
                            </span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleExecuteNormalization}
                        disabled={isNormalizing}
                        className="tap w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-bold text-white transition-colors"
                      >
                        {isNormalizing ? (
                          <>
                            <RefreshCw className="size-3.5 animate-spin" />
                            {t("Normalizing records in Firestore...", "ডাটাবেজে রেকর্ড আপডেট হচ্ছে...")}
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-3.5" />
                            {t("Normalize & Clean All Database Records Now", "সকল রেকর্ড একীভূত ও সংশোধন করুন")}
                          </>
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {normResult && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>
                    {t(
                      `Successfully updated ${normResult.totalUpdated} records (${normResult.updatedDiaryCount} diary, ${normResult.updatedRoutineCount} routine) to canonical subject names!`,
                      `সফলভাবে ${normResult.totalUpdated}টি রেকর্ড (${normResult.updatedDiaryCount}টি ডায়েরি, ${normResult.updatedRoutineCount}টি রুটিন) মাস্টার নামে একীকৃত হয়েছে!`,
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Active Subjects in Diary with entry counts */}
            {activeDiarySubjects.length > 0 && (
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                  {t("Active Subjects in Diary (click to rename):", "ডায়েরিতে সক্রিয় বিষয়সমূহ (এডিট করতে ক্লিক করুন):")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {activeDiarySubjects.map(({ name, count }) => {
                    const meta = getSubjectMeta(name);
                    return (
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
                        <span>{meta.emoji}</span>
                        <span>{name}</span>
                        <span className="rounded-full bg-black/10 dark:bg-white/15 px-1.5 py-0.2 text-[10px] font-bold">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manual Subject Rename Form */}
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
                  <SubjectCombobox
                    value={newSubjectName}
                    onChange={(val) => setNewSubjectName(val)}
                    suggestions={subjectSuggestions}
                    placeholder={t("e.g. Mathematics, English Literature", "যেমন: Mathematics, English Literature")}
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
                "One line per subject:\nEnglish Literature (Neon) | Ex 2.5 pg 26 | Pg 26 (5,6) | Bring compass\n\nOr multi-line:\nEnglish Literature (Neon)\nC.W: Chapter 1 done\nH.W: Page 10\nRemarks: Bring scale",
                "প্রতি লাইনে এক বিষয়:\nEnglish Literature (Neon) | Ex 2.5 pg 26 | Pg 26 (5,6) | মন্তব্য",
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
            const subject = resolveCanonicalSubject(draft.subject) || draft.subject.trim();
            if (!subject) return;
            addDiary({ ...draft, subject, date });
            setDraft(empty);
          }}
        >
          <div>
            <label className="text-xs font-bold text-muted-foreground">{t("Subject", "বিষয়")}</label>
            <div className="mt-1">
              <SubjectCombobox
                value={draft.subject}
                onChange={(val) => setDraft((prev) => ({ ...prev, subject: val }))}
                suggestions={subjectSuggestions}
                placeholder={t("Enter or select subject (e.g. Mathematics, English Literature)", "বিষয় লিখুন বা নির্বাচন করুন (যেমন: Mathematics, English Literature)")}
                className={field}
              />
            </div>
            {/* Quick-pick Master Subject chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MASTER_SUBJECTS.map((sub) => {
                const isSelected = draft.subject === sub.name;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, subject: sub.name }))}
                    className={`tap flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    <span>{sub.emoji}</span>
                    <span>{sub.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">C.W (Classwork)</label>
            <div className="mt-1">
              <DiaryContentEditor
                value={draft.cw}
                onChange={(value) => setDraft((prev) => ({ ...prev, cw: value }))}
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
                onChange={(value) => setDraft((prev) => ({ ...prev, hw: value }))}
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
                onChange={(value) => setDraft((prev) => ({ ...prev, remarks: value }))}
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
                onChange={(value) => setDraft((prev) => ({ ...prev, answer: value }))}
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
                subjectSuggestions={subjectSuggestions}
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
  subjectSuggestions = [],
}: {
  entry: DiaryEntry;
  onSave: (id: string, patch: Partial<DiaryEntry>) => void;
  onDelete: (id: string) => void;
  field: string;
  subjectSuggestions?: string[];
}) {
  const { t } = useApp();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(entry);

  useEffect(() => {
    if (!edit) {
      setForm(entry);
    }
  }, [entry, edit]);

  const meta = getSubjectMeta(entry.subject);

  if (!edit) {
    return (
      <li className="rounded-2xl bg-muted p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span>{meta.emoji}</span>
              <p className="text-sm font-bold">{entry.subject}</p>
            </div>
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
          <SubjectCombobox
            value={form.subject}
            onChange={(val) => setForm((prev) => ({ ...prev, subject: val }))}
            suggestions={subjectSuggestions}
            placeholder={t("Subject", "বিষয়")}
            className={field}
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-muted-foreground">C.W (Classwork)</label>
        <div className="mt-1">
          <DiaryContentEditor
            value={form.cw}
            onChange={(value) => setForm((prev) => ({ ...prev, cw: value }))}
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
            onChange={(value) => setForm((prev) => ({ ...prev, hw: value }))}
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
            onChange={(value) => setForm((prev) => ({ ...prev, remarks: value }))}
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
            onChange={(value) => setForm((prev) => ({ ...prev, answer: value }))}
            placeholder={t("Write or format your answer...", "আপনার উত্তর লিখুন বা ফরম্যাট করুন...")}
            rows={3}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            const subject = resolveCanonicalSubject(form.subject) || form.subject.trim();
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
