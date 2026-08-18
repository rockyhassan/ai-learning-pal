import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { PageShell, SectionCard } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/student-setup")({
  head: () => ({
    meta: [
      { title: "Student Setup — Wafi" },
      { name: "description", content: "Add your child's name, class, school, board and medium to personalise Wafi." },
      { property: "og:title", content: "Student Setup — Wafi" },
      { property: "og:description", content: "Set up your child's learning profile." },
    ],
  }),
  component: StudentSetup,
});

const fields = [
  { id: "name", en: "Full Name", bn: "পূর্ণ নাম", ph: "Muhammad Affan Hassan Wafi" },
  { id: "nickname", en: "Nickname", bn: "ডাকনাম", ph: "Wafi" },
  { id: "birthday", en: "Birthday", bn: "জন্মদিন", ph: "12 April 2016", type: "date" },
  { id: "class", en: "Class", bn: "শ্রেণি", ph: "Grade-3" },
  { id: "school", en: "School", bn: "স্কুল", ph: "KCIS" },
  { id: "board", en: "Board", bn: "বোর্ড", ph: "NCTB" },
  { id: "section", en: "Section", bn: "শাখা", ph: "A" },
  { id: "roll", en: "Roll", bn: "রোল", ph: "08" },
];

function StudentSetup() {
  const { t } = useApp();

  return (
    <PageShell
      title={t("Student Setup", "শিক্ষার্থীর তথ্য")}
      subtitle={t("Step 2 of 3", "ধাপ ২ / ৩")}
      back="/signup"
      hideNav
    >
      <SectionCard>
        <div className="flex items-center gap-4">
          <button className="tap grid size-20 shrink-0 place-items-center rounded-3xl border-2 border-dashed border-border bg-muted text-muted-foreground">
            <Camera className="size-6" />
          </button>
          <div>
            <p className="text-sm font-bold">{t("Photo Upload", "ছবি আপলোড")}</p>
            <p className="text-xs text-muted-foreground">
              {t("Tap to add your child's photo", "সন্তানের ছবি যোগ করতে চাপুন")}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t("Details", "বিস্তারিত")}>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.id} className="space-y-1.5 last:col-span-1">
              <Label htmlFor={f.id} className="text-xs">
                {t(f.en, f.bn)}
              </Label>
              <Input id={f.id} type={f.type ?? "text"} placeholder={f.ph} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("Medium", "মাধ্যম")}>
        <div className="grid grid-cols-2 gap-3">
          {["English", "Bangla"].map((m, i) => (
            <button
              key={m}
              className={`tap rounded-2xl border px-4 py-3 text-sm font-bold ${
                i === 0
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </SectionCard>

      <Link
        to="/school-profile"
        className="tap block rounded-2xl bg-primary py-3.5 text-center text-sm font-bold text-primary-foreground shadow-soft"
      >
        {t("Next: School Profile", "পরবর্তী: স্কুল প্রোফাইল")}
      </Link>
    </PageShell>
  );
}