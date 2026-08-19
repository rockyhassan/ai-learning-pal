import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { DiaryItemCard } from "@/components/diary-item-card";
import { useApp } from "@/lib/app-state";
import { useSchoolContent, formatDiaryDate } from "@/lib/school-content";
import { SubjectHistory } from "@/components/SubjectHistory";

export const Route = createFileRoute("/homework/")({
  head: () => ({
    meta: [
      { title: "Homework — Wafi" },
      {
        name: "description",
        content:
          "View today's school diary entries, classwork and homework assignments.",
      },
      { property: "og:title", content: "Homework — Wafi" },
      { property: "og:description", content: "School diary with classwork and homework." },
    ],
  }),
  component: HomeworkList,
});

function HomeworkList() {
  const { t } = useApp();
  const { diary } = useSchoolContent();
  const [activeTab, setActiveTab] = useState<"school" | "subject">("school");

  const safeDiary = Array.isArray(diary) ? diary : [];

  // Group all diary entries by date, sorted descending (newest first)
  const diaryByDate = [...safeDiary]
    .sort((a, b) => {
      // Handle undefined date fields safely
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1; // Entries without date sort to end
      if (!b.date) return -1;
      // Both have dates: sort descending (newest first)
      return b.date.localeCompare(a.date);
    })
    .reduce(
      (acc, entry) => {
        if (!entry.date) return acc; // Skip entries without date
        if (!acc[entry.date]) {
          acc[entry.date] = [];
        }
        acc[entry.date].push(entry);
        return acc;
      },
      {} as Record<string, typeof diary>,
    );

  const sortedDates = Object.keys(diaryByDate).sort((a, b) => b.localeCompare(a));

  return (
    <PageShell title={t("Homework", "হোমওয়ার্ক")}>
      {/* Tab Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("school")}
          className={`tap flex-1 rounded-2xl px-4 py-3 font-semibold text-sm transition-colors ${
            activeTab === "school"
              ? "bg-primary text-primary-foreground shadow-soft"
              : "border border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          {t("School Diary", "স্কুল ডায়েরি")}
        </button>
        <button
          onClick={() => setActiveTab("subject")}
          className={`tap flex-1 rounded-2xl px-4 py-3 font-semibold text-sm transition-colors ${
            activeTab === "subject"
              ? "bg-primary text-primary-foreground shadow-soft"
              : "border border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          {t("Subject History", "বিষয়ের ইতিহাস")}
        </button>
      </div>

      {/* School Diary Tab */}
      {activeTab === "school" && (
        <SectionCard
          title={t("School Diary", "স্কুল ডায়েরি")}
          hint={<Pill tone="primary">{safeDiary.length}</Pill>}
        >
          {safeDiary.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("No diary entries for today.", "আজকের কোনো ডায়েরি এন্ট্রি নেই।")}
            </p>
          ) : (
            <div className="space-y-4">
              {sortedDates.map((date) => (
                <div key={date}>
                  <p className="text-xs font-bold text-muted-foreground mb-2">
                    {formatDiaryDate(date)}
                  </p>
                  <ul className="space-y-3">
                    {diaryByDate[date].map((d) => (
                      <li key={d.id}>
                        <DiaryItemCard entry={d} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Subject History Tab */}
      {activeTab === "subject" && <SubjectHistory diary={diary} />}
    </PageShell>
  );
}
