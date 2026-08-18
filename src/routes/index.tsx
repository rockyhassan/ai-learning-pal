import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { LangToggle, ThemeToggle } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { useAccess } from "@/lib/access-store";

type IndexSearch = { redirect?: string | undefined };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign In — Wafi Learning" },
      {
        name: "description",
        content: "Sign in with Google to access your Wafi Learning Buddy dashboard.",
      },
      { property: "og:title", content: "Sign In — Wafi Learning" },
      { property: "og:description", content: "Google Sign-In for Wafi Learning Companion." },
    ],
  }),
  component: HomePage,
});

function getPostLoginRedirect(redirect?: string): string {
  if (redirect && redirect !== "/" && redirect !== "/login") {
    return redirect;
  }
  return "/dashboard";
}

function HomePage() {
  const { t } = useApp();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { signInWithGoogle, currentUser, authReady } = useAccess();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (authReady && currentUser) {
      if (currentUser.status === "disabled") {
        setError(
          t(
            "Your account has been disabled. Please contact the administrator.",
            "আপনার অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।"
          )
        );
      } else {
        const destination = getPostLoginRedirect(redirect);
        navigate({ to: destination as "/" });
      }
    }
  }, [authReady, currentUser, redirect, navigate, t]);

  const handleSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (!result.ok) {
        if (result.reason === "signin-cancelled") {
          // User closed popup
          setError(null);
        } else if (result.reason === "email-not-authorized") {
          setError(
            t(
              "Email not authorized. Please contact the administrator.",
              "ইমেইল অনুমোদিত নয়। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।"
            )
          );
        } else if (result.reason === "account-disabled") {
          setError(
            t(
              "Your account has been disabled. Please contact the administrator.",
              "আপনার অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।"
            )
          );
        } else {
          setError(
            t(
              "Sign in failed. Please try again.",
              "সাইন ইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।"
            )
          );
        }
      }
    } catch {
      setError(
        t(
          "An unexpected error occurred. Please try again.",
          "একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। আবার চেষ্টা করুন।"
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-background px-4 py-6 text-foreground sm:px-6">
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute -left-28 -top-28 size-80 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-28 top-1/3 size-80 rounded-full bg-accent/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/4 size-72 rounded-full bg-secondary/20 blur-3xl"
        aria-hidden="true"
      />

      {/* Top Header Controls */}
      <header className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label="Wafi Owl">
            🦉
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
            Wafi
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LangToggle />
        </div>
      </header>

      {/* Main Card Section */}
      <section className="relative z-10 my-auto flex w-full flex-col items-center justify-center py-8">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-border/80 bg-card/90 p-6 shadow-lift backdrop-blur-xl sm:p-8">
          {/* Mascot Logo */}
          <div className="flex justify-center">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-[2.2rem] gradient-sun opacity-50 blur-xl"
                aria-hidden="true"
              />
              <div className="relative grid size-20 place-items-center rounded-[2.2rem] gradient-sun shadow-lift ring-2 ring-background/80">
                <span className="animate-float text-4xl select-none" role="img" aria-label="Wafi Mascot">
                  🦉
                </span>
              </div>
            </div>
          </div>

          {/* Title & Tagline */}
          <div className="space-y-1.5 text-center">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {t("Welcome to Wafi", "ওয়াফিতে স্বাগতম")}
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              {t(
                "Your Child's AI Learning Companion",
                "আপনার সন্তানের এআই শেখার সঙ্গী"
              )}
            </p>
          </div>

          <hr className="border-border/60" />

          {/* Action Area */}
          <div className="space-y-4">
            <div className="space-y-1 text-center">
              <h2 className="text-base font-bold text-foreground">
                {t("Sign in to your account", "আপনার অ্যাকাউন্টে সাইন ইন করুন")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Use your authorized Google account to continue",
                  "চালিয়ে যেতে আপনার অনুমোদিত গুগল অ্যাকাউন্ট ব্যবহার করুন"
                )}
              </p>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isLoading || !authReady}
              className="tap group relative flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-bold text-foreground shadow-soft transition-all duration-200 hover:bg-accent/40 hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-5 animate-spin text-primary" />
                  <span>{t("Signing in...", "সাইন ইন হচ্ছে...")}</span>
                </>
              ) : (
                <>
                  {/* Google Multicolor Logo */}
                  <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27a7.2 7.2 0 0 1 0-4.54V6.58H1.25a11.98 11.98 0 0 0 0 10.84l4.03-3.15Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                    />
                  </svg>
                  <span>{t("Sign in with Google", "গুগল দিয়ে সাইন ইন করুন")}</span>
                </>
              )}
            </button>

            {/* Error Message Display */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-left text-xs font-semibold text-destructive animate-fade-in"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
                <span className="flex-1 leading-relaxed">{error}</span>
              </div>
            )}

            {/* Authorization Note */}
            <div className="flex items-start gap-2 rounded-2xl border border-border/50 bg-muted/40 p-3 text-left">
              <ShieldCheck className="size-4 shrink-0 text-primary mt-0.5" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t(
                  "Only authorized school and guardian accounts can access this platform. Contact your administrator if you need access.",
                  "শুধুমাত্র অনুমোদিত স্কুল ও অভিভাবক অ্যাকাউন্ট এখানে প্রবেশ করতে পারবে। অ্যাক্সেসের জন্য আপনার অ্যাডমিনের সাথে যোগাযোগ করুন।"
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mx-auto w-full max-w-4xl text-center text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} Wafi Learning. {t("All rights reserved.", "সর্বস্বত্ব সংরক্ষিত।")}
        </p>
      </footer>
    </main>
  );
}