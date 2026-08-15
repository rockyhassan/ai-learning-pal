import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell, SectionCard } from "@/components/app-shell";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/lib/app-state";
import { roleLabels, useAccess } from "@/lib/access-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Wafi" },
      { name: "description", content: "Change language, theme, voice, accent, dark mode and notification settings." },
      { property: "og:title", content: "Settings — Wafi" },
      { property: "og:description", content: "Make Wafi fit your family." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { t, lang, setLang, dark, setDark } = useApp();
  const { currentUser, signOut } = useAccess();
  const navigate = useNavigate();

  return (
    <PageShell title={t("Settings", "সেটিংস")} subtitle={t("Preferences", "পছন্দ")}>
      <SectionCard title={t("Language", "ভাষা")}>
        <div className="grid grid-cols-2 gap-3">
          {(["en", "bn"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`tap rounded-2xl border py-3 text-sm font-bold ${
                lang === l ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
              }`}
            >
              {l === "en" ? "English" : "বাংলা"}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("Appearance", "চেহারা")}>
        <label className="flex items-center justify-between py-1">
          <span className="text-sm font-semibold">{t("Dark Mode", "ডার্ক মোড")}</span>
          <Switch checked={dark} onCheckedChange={setDark} />
        </label>
      </SectionCard>

      <SectionCard title={t("Voice", "কণ্ঠস্বর")}>
        <div className="flex flex-wrap gap-2">
          {["Friendly", "Calm", "Kid"].map((v, i) => (
            <button
              key={v}
              className={`tap rounded-full px-4 py-2 text-xs font-bold ${
                i === 0 ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs font-semibold text-muted-foreground">{t("Accent", "উচ্চারণভঙ্গি")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {["British", "American", "Neutral"].map((a, i) => (
            <button
              key={a}
              className={`tap rounded-full px-4 py-2 text-xs font-bold ${
                i === 1 ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("Notifications", "নোটিফিকেশন")}>
        <ul className="space-y-3">
          {[
            { en: "Homework reminders", bn: "হোমওয়ার্ক রিমাইন্ডার" },
            { en: "Exam alerts", bn: "পরীক্ষার সতর্কতা" },
            { en: "Daily reading time", bn: "দৈনিক পড়ার সময়" },
            { en: "School notices", bn: "স্কুল নোটিশ" },
          ].map((n, i) => (
            <li key={n.en} className="flex items-center justify-between">
              <span className="text-sm">{t(n.en, n.bn)}</span>
              <Switch defaultChecked={i !== 3} />
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={t("Account", "অ্যাকাউন্ট")}>
        {currentUser ? (
          <>
            <p className="text-sm font-bold">
              {roleLabels[currentUser.role].emoji} {currentUser.name}
            </p>
            <p className="text-xs text-muted-foreground">{currentUser.email}</p>
            <button
              onClick={() => {
                signOut();
                navigate({ to: "/login" });
              }}
              className="tap mt-3 w-full rounded-2xl bg-destructive/12 py-3 text-sm font-bold text-destructive"
            >
              {t("Sign out", "সাইন আউট")}
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate({ to: "/login" })}
            className="tap w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            {t("Sign in", "সাইন ইন")}
          </button>
        )}
      </SectionCard>
    </PageShell>
  );
}