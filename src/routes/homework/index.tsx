import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ChevronRight, Image, PlusCircle, RefreshCw } from "lucide-react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { homework } from "@/lib/mock-data";

export const Route = createFileRoute("/homework/")({
  head: () => ({
    meta: [
      { title: "Homework — Wafi" },
      { name: "description", content: "Track today's homework, add it by camera scan or screenshot, and solve it with AI." },
      { property: "og:title", content: "Homework — Wafi" },
      { property: "og:description", content: "Pending and completed homework with AI help." },
    ],
  }),
  component: HomeworkList,
});

function HomeworkList() {
  const { t } = useApp();
  const pending = homework.filter((h) => h.status === "pending");
  const done = homework.filter((h) => h.status === "completed");

  return (
    <PageShell title={t("Homework", "হোমওয়ার্ক")} subtitle={t("Today", "আজ")}>
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Image, en: "Screenshot", bn: "স্ক্রিনশট" },
          { icon: Camera, en: "Camera", bn: "ক্যামেরা" },
          { icon: PlusCircle, en: "Manual", bn: "নিজে" },
          { icon: RefreshCw, en: "Sync", bn: "সিঙ্ক" },
        ].map((a) => (
          <button
            key={a.en}
            className="tap flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-1 py-3 shadow-soft"
          >
            <a.icon className="size-5 text-primary" />
            <span className="text-[10px] font-semibold">{t(a.en, a.bn)}</span>
          </button>
        ))}
      </div>

      <SectionCard title={t("Pending", "বাকি আছে")} hint={<Pill tone="warning">{pending.length}</Pill>}>
        <ul className="space-y-2">
          {pending.map((h) => (
            <li key={h.id}>
              <Link
                to="/homework/$homeworkId"
                params={{ homeworkId: h.id }}
                className="tap flex items-center gap-3 rounded-2xl bg-muted px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t(h.title, h.titleBn)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {h.subject} · {h.due}
                  </p>
                </div>
                <Pill tone="primary">AI Solve</Pill>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={t("Completed", "সম্পন্ন")} hint={<Pill tone="success">{done.length}</Pill>}>
        <ul className="space-y-2">
          {done.map((h) => (
            <li key={h.id}>
              <Link
                to="/homework/$homeworkId"
                params={{ homeworkId: h.id }}
                className="tap flex items-center gap-3 rounded-2xl bg-muted px-3 py-3 opacity-80"
              >
                <span className="text-success">✓</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold line-through">{t(h.title, h.titleBn)}</p>
                  <p className="text-[11px] text-muted-foreground">{h.subject}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>
    </PageShell>
  );
}