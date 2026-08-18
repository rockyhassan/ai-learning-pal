import { Link } from "@tanstack/react-router";
import { LangToggle, SettingsButton } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { useAccess } from "@/lib/access-store";

export function DashboardHeader() {
  const { t } = useApp();
  const { currentUser } = useAccess();

  return (
    <header className="sticky top-0 z-50 w-full gradient-hero text-primary-foreground">
      <div className="mx-auto flex max-w-[800px] items-center justify-between px-6 pt-5 pb-5">
        <div className="flex items-center gap-3">
          <Link
            aria-label="Profile"
            className="tap grid size-11 place-items-center rounded-2xl bg-primary-foreground/15 text-xl backdrop-blur-sm shadow-sm"
            to="/profile"
          >
            🦉
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs opacity-80">{t("Good morning", "শুভ সকাল")}</p>
            <p className="truncate text-lg font-bold leading-tight tracking-tight text-primary-foreground">
              {currentUser?.name?.split(" ")[0] || "Rocky"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SettingsButton />
          <LangToggle />
        </div>
      </div>
      {/* Curved background cutout attached to header bottom */}
      <div className="mx-auto h-6 max-w-[800px] rounded-t-[2rem] bg-background" />

      {/* Smooth subtle gradient fade below the curved header for scrolling content */}
      <div className="pointer-events-none absolute top-full left-0 right-0 h-4 overflow-hidden">
        <div className="mx-auto h-full max-w-[800px] bg-gradient-to-b from-background/80 via-background/40 to-transparent" />
      </div>
    </header>
  );
}