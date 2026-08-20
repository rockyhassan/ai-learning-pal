import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { LangToggle, SettingsButton } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { useAccess } from "@/lib/access-store";
import { auth } from "@/lib/firebase";

function getGreeting(t: (en: string, bn: string) => string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return t("Good morning", "সুপ্রভাত");
  }
  if (hour >= 12 && hour < 17) {
    return t("Good afternoon", "শুভ দুপুর");
  }
  if (hour >= 17 && hour < 21) {
    return t("Good evening", "শুভ সন্ধ্যা");
  }
  return t("Good night", "শুভ রাত্রি");
}

export function DashboardHeader() {
  const { t } = useApp();
  const { currentUser } = useAccess();
  const [imageError, setImageError] = useState(false);

  const photoURL = currentUser?.photoURL || auth.currentUser?.photoURL;
  const showUserPhoto = Boolean(photoURL && !imageError);
  const rawDisplayName = auth.currentUser?.displayName || currentUser?.name || "Rocky";
  const displayName = rawDisplayName.trim();
  const firstName = displayName.split(/\s+/)[0] || displayName;

  return (
    <header className="sticky top-0 z-50 w-full gradient-hero text-primary-foreground">
      <div className="relative mx-auto flex max-w-[800px] items-center justify-between px-3.5 sm:px-6 pt-3.5 pb-3.5 sm:pt-5 sm:pb-5">
        <div className="relative z-10 flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            aria-label="Profile"
            className="tap grid size-8 sm:size-11 shrink-0 place-items-center overflow-hidden rounded-xl sm:rounded-2xl bg-primary-foreground/15 text-lg sm:text-xl backdrop-blur-sm shadow-sm"
            to="/profile"
          >
            {showUserPhoto ? (
              <img
                src={photoURL!}
                alt={displayName || "User Profile"}
                referrerPolicy="no-referrer"
                className="size-full rounded-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <img
                src="/icon-192x192.png"
                alt="Wafi Learning Buddy"
                className="size-full object-contain p-0.5"
              />
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <p className="hidden sm:block text-xs opacity-80">{getGreeting(t)}</p>
            <p className="truncate text-sm sm:text-lg font-bold leading-tight tracking-tight text-primary-foreground">
              <span className="sm:hidden">{firstName}</span>
              <span className="hidden sm:inline">{displayName}</span>
            </p>
          </div>
        </div>

        {/* Centered Wafi Learning Buddy horizontal logo */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <img
            src="/wafi-learning-buddy-header.png"
            alt="Wafi Learning Buddy"
            className="w-[92px] sm:w-[160px] md:w-[180px] h-auto max-h-8 sm:max-h-10 object-contain drop-shadow-sm select-none"
          />
        </div>

        <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 shrink-0">
          <SettingsButton />
          <LangToggle />
        </div>
      </div>
      {/* Curved background cutout attached to header bottom */}
      <div className="mx-auto h-5 sm:h-6 max-w-[800px] rounded-t-[1.5rem] sm:rounded-t-[2rem] bg-canvas" />

      {/* Smooth subtle gradient fade below the curved header for scrolling content */}
      <div className="pointer-events-none absolute top-full left-0 right-0 h-4 overflow-hidden">
        <div className="mx-auto h-full max-w-[800px] bg-gradient-to-b from-canvas/80 via-canvas/40 to-transparent" />
      </div>
    </header>
  );
}