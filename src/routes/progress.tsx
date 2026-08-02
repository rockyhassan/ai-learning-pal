import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis } from "recharts";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { Progress as Bar2 } from "@/components/ui/progress";
import { useApp } from "@/lib/app-state";
import { monthlyProgress, subjects, weeklyProgress } from "@/lib/mock-data";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Wafi" },
      { name: "description", content: "Subject-wise and chapter-wise progress, weak topics, strong topics and weekly graphs." },
      { property: "og:title", content: "Progress — Wafi" },
      { property: "og:description", content: "See exactly where your child is improving." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { t, lang } = useApp();
  return (
    <PageShell title={t("Progress", "অগ্রগতি")} subtitle={t("This week", "এই সপ্তাহ")}>
      <SectionCard title={t("Weekly Study Minutes", "সাপ্তাহিক পড়ার সময়")}>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
              <Bar dataKey="minutes" fill="var(--chart-1)" radius={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title={t("Monthly Score", "মাসিক স্কোর")}>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} />
              <Line type="monotone" dataKey="score" stroke="var(--chart-3)" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title={t("Subject Wise", "বিষয়ভিত্তিক")}>
        <ul className="space-y-3">
          {subjects.map((s) => (
            <li key={s.slug}>
              <div className="mb-1 flex justify-between text-xs font-semibold">
                <span>
                  {s.emoji} {lang === "bn" ? s.bn : s.en}
                </span>
                <span className="text-muted-foreground">{s.progress}%</span>
              </div>
              <Bar2 value={s.progress} className="h-1.5" />
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="grid grid-cols-2 gap-3">
        <SectionCard title={t("Weak", "দুর্বল")}>
          <div className="flex flex-wrap gap-1.5">
            {["Fractions", "Past tense", "Spelling"].map((w) => (
              <Pill key={w} tone="destructive">
                {w}
              </Pill>
            ))}
          </div>
        </SectionCard>
        <SectionCard title={t("Strong", "শক্তিশালী")}>
          <div className="flex flex-wrap gap-1.5">
            {["Tables", "Reading", "Drawing"].map((w) => (
              <Pill key={w} tone="success">
                {w}
              </Pill>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}