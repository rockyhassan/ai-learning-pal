import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { useState } from "react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-state";
import { roleLabels, useAccess } from "@/lib/access-store";

type LoginSearch = { redirect?: string | undefined };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign In — Wafi Learning" },
      {
        name: "description",
        content:
          "Sign in with the email your admin approved to open your parent, teacher, student or admin dashboard.",
      },
      { property: "og:title", content: "Sign In — Wafi Learning" },
      { property: "og:description", content: "Email-based sign in for Wafi." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useApp();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { users, signIn, currentUser, signOut } = useAccess();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const go = (value: string) => {
    const res = signIn(value);
    if (!res.ok) {
      setError(
        res.reason === "disabled"
          ? t("This account is disabled.", "এই অ্যাকাউন্টটি বন্ধ আছে।")
          : t("No access for this email. Ask the admin.", "এই ইমেইলের অ্যাক্সেস নেই। অ্যাডমিনকে বলুন।"),
      );
      return;
    }
    setError(null);
    navigate({ to: (redirect && redirect !== "/login" ? redirect : "/dashboard") as "/" });
  };

  return (
    <PageShell
      title={t("Sign In", "সাইন ইন")}
      subtitle={t("Use your approved email", "অনুমোদিত ইমেইল ব্যবহার করুন")}
      back="/"
      hideNav
    >
      {currentUser ? (
        <SectionCard title={t("Signed in", "সাইন ইন করা আছে")}>
          <p className="text-sm font-bold">{currentUser.name}</p>
          <p className="text-xs text-muted-foreground">{currentUser.email}</p>
          <button
            onClick={signOut}
            className="tap mt-3 w-full rounded-2xl bg-muted py-3 text-sm font-bold"
          >
            {t("Sign out", "সাইন আউট")}
          </button>
        </SectionCard>
      ) : null}

      <SectionCard title={t("Email", "ইমেইল")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(email);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="login-email">{t("Your email", "আপনার ইমেইল")}</Label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>
          {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}
          <button
            type="submit"
            className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground"
          >
            <LogIn className="size-4" />
            {t("Continue", "চালিয়ে যান")}
          </button>
        </form>
      </SectionCard>

      <SectionCard title={t("Demo accounts", "ডেমো অ্যাকাউন্ট")}>
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => go(u.email)}
                className="tap flex w-full items-center gap-3 rounded-2xl bg-muted px-3 py-2.5 text-left"
              >
                <span className="text-base">{roleLabels[u.role].emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{u.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {u.email}
                  </span>
                </span>
                <Pill tone={u.status === "active" ? "success" : "warning"}>
                  {t(roleLabels[u.role].en, roleLabels[u.role].bn)}
                </Pill>
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>
    </PageShell>
  );
}
