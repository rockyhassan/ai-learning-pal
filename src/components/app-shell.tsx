import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Home,
  Languages,
  Moon,
  NotebookPen,
  ScanLine,
  Settings,
  Sun,
} from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "@/lib/app-state";
import { cn } from "@/lib/utils";

export function SettingsButton() {
  return (
    <Link
      to="/settings"
      className="tap inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-soft transition-colors hover:bg-accent/40"
      aria-label="Settings"
    >
      <Settings className="size-4" />
    </Link>
  );
}

export function LangToggle() {
  const { lang, toggleLang } = useApp();
  return (
    <button
      type="button"
      onClick={toggleLang}
      className="tap inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-soft"
      aria-label="Toggle language"
    >
      <Languages className="size-3.5" />
      {lang === "en" ? "EN" : "বাং"}
    </button>
  );
}

export function ThemeToggle() {
  const { dark, setDark, t } = useApp();
  return (
    <button
      type="button"
      onClick={() => setDark(!dark)}
      className="tap inline-flex items-center justify-center rounded-full border border-border bg-card p-1.5 text-foreground shadow-soft transition-colors hover:bg-accent/40"
      aria-label={dark ? t("Switch to light mode", "লাইট মোড চালু করুন") : t("Switch to dark mode", "ডার্ক মোড চালু করুন")}
      title={dark ? t("Light Mode", "লাইট মোড") : t("Dark Mode", "ডার্ক মোড")}
    >
      {dark ? <Sun className="size-3.5 text-amber-400" /> : <Moon className="size-3.5 text-slate-600" />}
    </button>
  );
}

const nav = [
  { to: "/dashboard", icon: Home, en: "Home", bn: "হোম" },
  { to: "/study", icon: BookOpen, en: "Study", bn: "পড়া" },
  { to: "/scan", icon: ScanLine, en: "Scan", bn: "স্ক্যান" },
  { to: "/homework", icon: NotebookPen, en: "Homework", bn: "হোমওয়ার্ক" },
  { to: "/planner", icon: Calendar, en: "Routine", bn: "রুটিন" },
] as const;

export function BottomNav() {
  const { t } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[800px] -translate-x-1/2 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="flex items-stretch justify-between">
        {nav.map((item) => {
          const active = pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                className={cn(
                  "tap flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-2xl transition-colors",
                    active ? "bg-secondary" : "bg-transparent",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                {t(item.en, item.bn)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PageShell({
  title,
  subtitle,
  back = "/dashboard",
  action,
  children,
  hideNav,
}: {
  title: string;
  subtitle?: string;
  back?: string | false;
  action?: ReactNode;
  children: ReactNode;
  hideNav?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 py-3 backdrop-blur shadow-sm">
        <div className="flex items-center gap-3">
          {back ? (
            <Link
              to={back as "/"}
              className="tap grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card"
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </Link>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {action ?? <LangToggle />}
        </div>
      </header>
      <main className="animate-pop space-y-4 px-4 py-4">{children}</main>
      {hideNav ? null : <BottomNav />}
    </div>
  );
}

export function SectionCard({
  title,
  hint,
  children,
  className,
}: {
  title?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-3xl border border-border bg-card p-4 shadow-soft", className)}
    >
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {title}
          </h2>
          {hint}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "primary" | "success" | "warning" | "info" | "destructive" | "accent";
}) {
  const tones: Record<string, string> = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/12 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    info: "bg-info/15 text-info",
    destructive: "bg-destructive/12 text-destructive",
    accent: "bg-accent/25 text-accent-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function TileGrid({
  items,
}: {
  items: { to: string; emoji: string; label: string; sub?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <Link
          key={item.to + item.label}
          to={item.to as "/"}
          className="tap rounded-3xl border border-border gradient-card p-4 shadow-soft"
        >
          <span className="text-2xl">{item.emoji}</span>
          <p className="mt-2 text-sm font-bold leading-tight">{item.label}</p>
          {item.sub ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{item.sub}</p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}