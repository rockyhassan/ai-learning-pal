import { createFileRoute, Link } from "@tanstack/react-router";
import { Apple, Chrome, Mail } from "lucide-react";
import { PageShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Parent Sign Up — Wafi" },
      { name: "description", content: "Create a parent account to set up your child's learning profile on Wafi." },
      { property: "og:title", content: "Parent Sign Up — Wafi" },
      { property: "og:description", content: "Create a parent account on Wafi." },
    ],
  }),
  component: SignUp,
});

function SignUp() {
  const { t } = useApp();

  return (
    <PageShell
      title={t("Parent Account", "অভিভাবক অ্যাকাউন্ট")}
      subtitle={t("Step 1 of 3", "ধাপ ১ / ৩")}
      back="/"
      hideNav
    >
      <div className="space-y-3">
        {[
          { icon: Chrome, en: "Continue with Google", bn: "গুগল দিয়ে চালিয়ে যান" },
          { icon: Apple, en: "Continue with Apple", bn: "অ্যাপল দিয়ে চালিয়ে যান" },
        ].map((p) => (
          <button
            key={p.en}
            className="tap flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-bold shadow-soft"
          >
            <p.icon className="size-4" />
            {t(p.en, p.bn)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 py-1 text-[11px] font-semibold uppercase text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t("or email", "অথবা ইমেইল")}
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-3 rounded-3xl border border-border bg-card p-4 shadow-soft">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("Parent Email", "অভিভাবকের ইমেইল")}</Label>
          <Input id="email" type="email" placeholder="parent@email.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pass">{t("Password", "পাসওয়ার্ড")}</Label>
          <Input id="pass" type="password" placeholder="••••••••" />
        </div>
        <Link
          to="/student-setup"
          className="tap mt-2 flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-soft"
        >
          <Mail className="size-4" />
          {t("Create Account", "অ্যাকাউন্ট খুলুন")}
        </Link>
      </div>

      <p className="px-2 text-center text-[11px] leading-relaxed text-muted-foreground">
        {t(
          "Parents manage the account. Children use the student profile.",
          "অ্যাকাউন্ট অভিভাবক পরিচালনা করবেন। শিশুরা স্টুডেন্ট প্রোফাইল ব্যবহার করবে।",
        )}
      </p>
    </PageShell>
  );
}