import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useApp } from "@/lib/app-state";
import type { DiaryEntry } from "@/lib/school-content";

export interface SubjectBadgeMeta {
  emoji: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export function getSubjectBadgeMeta(subject: string): SubjectBadgeMeta {
  const lower = (subject || "").toLowerCase();

  if (lower.includes("bangla") || lower.includes("বাংলা") || lower.includes("bengali")) {
    return {
      emoji: "✍️",
      bgClass: "bg-rose-50",
      textClass: "text-rose-600",
      borderClass: "border-rose-100",
    };
  }
  if (lower.includes("math") || lower.includes("গণিত") || lower.includes("অংক") || lower.includes("maths")) {
    return {
      emoji: "📐",
      bgClass: "bg-blue-50",
      textClass: "text-blue-600",
      borderClass: "border-blue-100",
    };
  }
  if (lower.includes("english") || lower.includes("ইংরেজি")) {
    return {
      emoji: "🔤",
      bgClass: "bg-indigo-50",
      textClass: "text-indigo-600",
      borderClass: "border-indigo-100",
    };
  }
  if (lower.includes("science") || lower.includes("বিজ্ঞান")) {
    return {
      emoji: "🔬",
      bgClass: "bg-emerald-50",
      textClass: "text-emerald-600",
      borderClass: "border-emerald-100",
    };
  }
  if (
    lower.includes("islam") ||
    lower.includes("religion") ||
    lower.includes("ধর্ম") ||
    lower.includes("quran") ||
    lower.includes("হাদিস") ||
    lower.includes("কুরআন") ||
    lower.includes("দ্বীন")
  ) {
    return {
      emoji: "🕌",
      bgClass: "bg-teal-50",
      textClass: "text-teal-600",
      borderClass: "border-teal-100",
    };
  }
  if (
    lower.includes("bgs") ||
    lower.includes("social") ||
    lower.includes("বাংলাদেশ") ||
    lower.includes("পরিবেশ")
  ) {
    return {
      emoji: "🌏",
      bgClass: "bg-amber-50",
      textClass: "text-amber-600",
      borderClass: "border-amber-100",
    };
  }
  if (
    lower.includes("ict") ||
    lower.includes("computer") ||
    lower.includes("কম্পিউটার") ||
    lower.includes("তথ্য")
  ) {
    return {
      emoji: "💻",
      bgClass: "bg-violet-50",
      textClass: "text-violet-600",
      borderClass: "border-violet-100",
    };
  }
  if (
    lower.includes("draw") ||
    lower.includes("art") ||
    lower.includes("চিত্রাঙ্কন") ||
    lower.includes("আঁকা")
  ) {
    return {
      emoji: "🎨",
      bgClass: "bg-pink-50",
      textClass: "text-pink-600",
      borderClass: "border-pink-100",
    };
  }
  if (
    lower.includes("gk") ||
    lower.includes("general knowledge") ||
    lower.includes("জ্ঞান")
  ) {
    return {
      emoji: "🧠",
      bgClass: "bg-purple-50",
      textClass: "text-purple-600",
      borderClass: "border-purple-100",
    };
  }
  if (lower.includes("arabic") || lower.includes("আরবি")) {
    return {
      emoji: "📖",
      bgClass: "bg-emerald-50",
      textClass: "text-emerald-600",
      borderClass: "border-emerald-100",
    };
  }

  return {
    emoji: "📚",
    bgClass: "bg-slate-50",
    textClass: "text-slate-700",
    borderClass: "border-slate-200",
  };
}

export interface DiaryItemCardProps {
  entry: Pick<DiaryEntry, "id" | "subject"> & Partial<Pick<DiaryEntry, "cw" | "hw">>;
  className?: string;
}

export function DiaryItemCard({ entry, className = "" }: DiaryItemCardProps) {
  const { t } = useApp();
  const meta = getSubjectBadgeMeta(entry.subject);

  return (
    <Link
      to="/homework/diary/$diaryId"
      params={{ diaryId: entry.id }}
      className={`group tap flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-white p-4 pb-5 shadow-sm hover:shadow-md transition-all active:scale-[0.99] ${className}`}
    >
      {/* Subject Icon Badge */}
      <div
        className={`shrink-0 size-11 rounded-xl flex items-center justify-center text-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] border ${meta.bgClass} ${meta.borderClass}`}
      >
        <span>{meta.emoji}</span>
      </div>

      {/* Subject Details */}
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-extrabold text-slate-800 leading-snug tracking-tight">
          {entry.subject}
        </h3>

        {(entry.cw || entry.hw) && (
          <div className="mt-2 space-y-1.5">
            {entry.cw && (
              <div className="flex items-start gap-2">
                <span className="inline-flex items-center shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-100/80">
                  {t("C.W", "সি.ডব্লু")}:
                </span>
                <p className="text-sm font-medium text-slate-700 leading-snug break-words flex-1">
                  {entry.cw}
                </p>
              </div>
            )}
            {entry.hw && (
              <div className="flex items-start gap-2">
                <span className="inline-flex items-center shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-100/80">
                  {t("H.W", "এইচ.ডব্লু")}:
                </span>
                <p className="text-sm font-medium text-slate-700 leading-snug break-words flex-1">
                  {entry.hw}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Chevron */}
      <div className="shrink-0 self-center pl-1">
        <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
          <ChevronRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
