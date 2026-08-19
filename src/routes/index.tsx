import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { LangToggle } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { useAccess } from "@/lib/access-store";

type IndexSearch = { redirect?: string | undefined };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Wafi — AI Learning Companion" },
      {
        name: "description",
        content: "Welcome to Wafi Learning Buddy - Your Child's AI Learning Companion.",
      },
      { property: "og:title", content: "Wafi — AI Learning Companion" },
      { property: "og:description", content: "Your Child's AI Learning Companion." },
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
    <main className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-x-hidden bg-[#F3F8FF] px-4 py-4 sm:px-6 sm:py-6 text-foreground selection:bg-indigo-100">
      {/* Soft pastel ambient background glows */}
      <div
        className="pointer-events-none absolute -top-24 -left-20 size-80 rounded-full bg-blue-200/40 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/4 -right-20 size-96 rounded-full bg-indigo-200/35 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 size-80 rounded-full bg-purple-200/30 blur-3xl"
        aria-hidden="true"
      />

      {/* Top Header - Minimal Language Selector */}
      <header className="relative z-10 mx-auto flex w-full max-w-lg items-center justify-end">
        <LangToggle />
      </header>

      {/* Center Content: Logo, Branding, Heading & Start Button */}
      <section className="relative z-10 my-auto flex w-full flex-col items-center justify-center text-center px-2 py-4 animate-pop">
        {/* Wafi Learning Buddy Logo Image */}
        <div className="relative flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-300/30 via-indigo-300/30 to-purple-300/30 blur-2xl transform scale-90"
            aria-hidden="true"
          />
          <img
            src="/icon-512x512.png"
            alt="Wafi Learning Buddy"
            className="relative w-[250px] sm:w-[350px] md:w-[430px] max-w-[85vw] h-auto object-contain select-none pointer-events-none drop-shadow-md animate-float"
            loading="eager"
          />
        </div>

        {/* Title & Tagline */}
        <div className="mt-4 sm:mt-6 space-y-1.5 sm:space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-800">
            {t("Welcome to Wafi", "ওয়াফিতে স্বাগতম")}
          </h1>
          <p className="text-sm sm:text-base font-medium text-slate-600 max-w-xs sm:max-w-sm mx-auto leading-relaxed">
            {t(
              "Your Child's AI Learning Companion",
              "আপনার সন্তানের এআই শেখার সঙ্গী"
            )}
          </p>
        </div>

        {/* Action Button: Start ✨ */}
        <div className="mt-6 sm:mt-8 w-full max-w-xs px-2">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isLoading || !authReady}
            className="tap group relative flex h-14 sm:h-16 w-full items-center justify-center gap-2.5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 font-display text-lg sm:text-xl font-bold tracking-wide text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/35 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-6 animate-spin text-white" />
                <span>{t("Starting...", "শুরু হচ্ছে...")}</span>
              </>
            ) : (
              <>
                <span>{t("Start", "শুরু করো")}</span>
                <Sparkles className="size-5 sm:size-6 text-amber-300 animate-pulse shrink-0" />
              </>
            )}
          </button>
        </div>

        {/* Error Alert Display (if any) */}
        {error && (
          <div
            role="alert"
            className="mt-4 flex max-w-xs items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive animate-fade-in"
          >
            <AlertCircle className="size-4 shrink-0 text-destructive" />
            <span className="flex-1 text-left leading-tight">{error}</span>
          </div>
        )}
      </section>

      {/* Footer - Subtle Safety Trust Message */}
      <footer className="relative z-10 mx-auto flex w-full max-w-lg items-center justify-center pt-4 pb-2 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500/80">
          <ShieldCheck className="size-3.5 text-indigo-500/70 shrink-0" />
          <span>
            {t("Safe. Secure. Made for Kids.", "নিরাপদ। নির্ভরযোগ্য। শিশুদের জন্য তৈরি।")}
          </span>
        </div>
      </footer>
    </main>
  );
}