import { createFileRoute, Link } from "@tanstack/react-router";
import { ImagePlus } from "lucide-react";
import { PageShell, SectionCard, Pill } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-state";
import { routine, teachers } from "@/lib/mock-data";

export const Route = createFileRoute("/school-profile")({
  head: () => ({
    meta: [
      { title: "School Profile — Wafi" },
      { name: "description", content: "Add school name, logo, class routine, teachers and exam system to Wafi." },
      { property: "og:title", content: "School Profile — Wafi" },
      { property: "og:description", content: "Set up the school routine, teachers and exam system." },
    ],
  }),
  component: SchoolProfile,
});

function SchoolProfile() {
  const { t } = useApp();

  return (
    <PageShell
      title={t("School Profile", "স্কুল প্রোফাইল")}
      subtitle={t("Step 3 of 3", "ধাপ ৩ / ৩")}
      back="/student-setup"
      hideNav
    >
      <SectionCard>
        <div className="flex items-center gap-4">
          <button className="tap grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-dashed border-border bg-muted text-muted-foreground">
            <ImagePlus className="size-5" />
          </button>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="school-name" className="text-xs">
              {t("School Name", "স্কুলের নাম")}
            </Label>
            <Input id="school-name" placeholder="Sunrise Model School" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t("Routine", "রুটিন")} hint={<Pill tone="primary">Sat–Thu</Pill>}>
        <ul className="divide-y divide-border">
          {routine.slice(0, 5).map((r) => (
            <li key={r.time} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-14 font-bold text-primary">{r.time}</span>
              <span className="flex-1 font-medium">{r.subject}</span>
              <span className="text-xs text-muted-foreground">{r.room}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={t("Teachers", "শিক্ষকবৃন্দ")}>
        <ul className="space-y-2">
          {teachers.map((tr) => (
            <li key={tr.name} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2">
              <span className="grid size-9 place-items-center rounded-full bg-card text-sm font-bold">
                {tr.name.split(" ")[1]?.[0] ?? "T"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{tr.name}</p>
                <p className="text-[11px] text-muted-foreground">{tr.subject}</p>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={t("Exam System", "পরীক্ষা পদ্ধতি")}>
        <div className="flex flex-wrap gap-2">
          {["Class Test", "Mid Term", "Final", "GPA 5.00", "100 Marks"].map((e) => (
            <Pill key={e} tone="accent">
              {e}
            </Pill>
          ))}
        </div>
      </SectionCard>

      <Link
        to="/dashboard"
        className="tap block rounded-2xl bg-primary py-3.5 text-center text-sm font-bold text-primary-foreground shadow-soft"
      >
        {t("Finish & Open Dashboard", "শেষ করে ড্যাশবোর্ডে যাই")}
      </Link>
    </PageShell>
  );
}