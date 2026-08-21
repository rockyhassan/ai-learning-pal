import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useApp } from "@/lib/app-state";
import type { DiaryEntry } from "@/lib/school-content";
import { getSubjectMeta, type SubjectBadgeMeta } from "@/lib/subjects";
import { hasRichTextContent } from "@/lib/rich-text";
import { DiaryContentRenderer } from "@/components/DiaryContentRenderer";

export const getSubjectBadgeMeta = getSubjectMeta;
export type { SubjectBadgeMeta };


export interface DiaryItemCardProps {
  entry: Pick<DiaryEntry, "id" | "subject"> & Partial<Pick<DiaryEntry, "cw" | "hw" | "remarks">>;
  className?: string;
}

export function DiaryItemCard({ entry, className = "" }: DiaryItemCardProps) {
  const { t } = useApp();
  const meta = getSubjectBadgeMeta(entry.subject);

  const hasCw = hasRichTextContent(entry.cw);
  const hasHw = hasRichTextContent(entry.hw);
  const hasRemarks = hasRichTextContent(entry.remarks);
  const hasContent = Boolean(hasCw || hasHw || hasRemarks);

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

        {hasContent && (
          <div className="mt-2 space-y-1.5">
            {hasCw && (
              <div className="flex items-start gap-2">
                <span className="inline-flex items-center shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-100/80">
                  {t("C.W", "সি.ডব্লু")}:
                </span>
                <DiaryContentRenderer
                  content={entry.cw}
                  className="text-sm text-slate-700 leading-snug break-words flex-1 font-normal"
                />
              </div>
            )}
            {hasHw && (
              <div className="flex items-start gap-2">
                <span className="inline-flex items-center shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-100/80">
                  {t("H.W", "এইচ.ডব্লু")}:
                </span>
                <DiaryContentRenderer
                  content={entry.hw}
                  className="text-sm text-slate-700 leading-snug break-words flex-1 font-normal"
                />
              </div>
            )}
            {hasRemarks && (
              <div className="flex items-start gap-2">
                <span className="inline-flex items-center shrink-0 rounded bg-purple-50 px-1.5 py-0.5 text-xs font-bold text-purple-700 border border-purple-100/80">
                  {t("Remarks", "মন্তব্য")}:
                </span>
                <DiaryContentRenderer
                  content={entry.remarks}
                  className="text-sm text-slate-700 leading-snug break-words flex-1 font-normal"
                />
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
