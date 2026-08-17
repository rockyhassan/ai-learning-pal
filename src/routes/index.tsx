import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, ChevronRight, GraduationCap, BookOpen, Users } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { LangToggle } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-state";
import { roleLabels, useAccess } from "@/lib/access-store";
import { StudentAvatar, TeacherAvatar, ParentAvatar } from "@/components/login-avatars";

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
        content:
          "Sign in with the email your admin approved to open your parent, teacher, student or admin dashboard.",
      },
      { property: "og:title", content: "Sign In — Wafi Learning" },
      { property: "og:description", content: "Email-based sign in for Wafi." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t } = useApp();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { users, signIn, currentUser, signOut, signInAsAdmin } = useAccess();
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher" | "parent" | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAdminSigningIn, setIsAdminSigningIn] = useState(false);

  const handleRoleSelect = (role: "student" | "teacher" | "parent") => {
    setSelectedRole(role);
    setPin("");
    setError(null);
  };

  const handlePinSubmit = useCallback(() => {
    if (!selectedRole || pin.length !== 4) return;

    const user = users.find((u) => u.role === selectedRole && u.status === "active");

    if (!user) {
      setError(t("No account found for this role.", "এই ভূমিকার জন্য কোনো অ্যাকাউন্ট পাওয়া যায়নি।"));
      return;
    }

    const res = signIn(user.email, pin);
    if (!res.ok) {
      setError(
        res.reason === "disabled"
          ? t("This account is disabled.", "এই অ্যাকাউন্টটি বন্ধ আছে।")
          : res.reason === "invalid-pin"
            ? t("Incorrect PIN.", "ভুল পিন।")
            : t("No access for this email. Ask the admin.", "এই ইমেইলের অ্যাক্সেস নেই। অ্যাডমিনকে বলুন।"),
      );
      return;
    }
    setError(null);
    navigate({ to: (redirect && redirect !== "/login" ? redirect : "/dashboard") as "/" });
  }, [selectedRole, pin, users, signIn, t, redirect, navigate]);

  const handleAdminSignIn = async () => {
    setIsAdminSigningIn(true);
    setError(null);
    const result = await signInAsAdmin();
    if (!result.ok) {
      setError(result.reason || "Failed to sign in with Google.");
      setIsAdminSigningIn(false);
    }
  };

  // Keypad handlers
  const handleKeypadNumber = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(null);
    }
  };

  const handleKeypadBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setPin("");
  };

  // DIAGNOSTIC: Log role cards rendering
  useEffect(() => {
    if (!selectedRole) {
      console.log("[DIAG] Role selection cards rendering:", {
        availableRoles: (["student", "teacher", "parent"] as const)
          .map((role) => {
            const user = users.find((u) => u.role === role);
            return user
              ? {
                  role,
                  userId: user.id,
                  name: user.name,
                  email: user.email,
                  status: user.status,
                }
              : null;
          })
          .filter(Boolean),
      });
    }
  }, [users, selectedRole]);

  // Auto-redirect to dashboard after Firebase redirect returns with admin user
  useEffect(() => {
    if (currentUser?.role === "admin") {
      const timer = setTimeout(() => {
        navigate({ to: (redirect && redirect !== "/login" ? redirect : "/dashboard") as "/" });
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [currentUser, redirect, navigate]);

  // Auto-submit PIN when 4 digits are entered
  useEffect(() => {
    if (selectedRole && pin.length === 4) {
      // Use a small delay to ensure the state is fully updated
      const timer = setTimeout(() => {
        handlePinSubmit();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pin, selectedRole, handlePinSubmit]);

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden gradient-hero px-4 pt-6 pb-12 text-primary-foreground">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -left-20 top-20 size-60 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 size-64 rounded-full bg-success/15 blur-3xl" />

      {/* Top Header & Logo Section */}
      <div className="w-full">
        <div className="relative flex justify-between items-center mb-2 px-1">
          <h1 className="text-2xl font-black tracking-tight">Wafi</h1>
          <LangToggle />
        </div>

        {/* Mascot Logo */}
        <div className="relative flex justify-center mb-3 mt-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-[2.2rem] gradient-sun opacity-60 blur-xl" />
            <div className="relative grid size-24 place-items-center rounded-[2.2rem] gradient-sun shadow-lift ring-2 ring-primary-foreground/25">
              <span className="text-5xl animate-float">🦉</span>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <p className="relative text-center text-sm sm:text-base font-semibold opacity-95 mb-6 tracking-tight">
          {t("Your Child's AI Learning Companion", "আপনার সন্তানের এআই শেখার সঙ্গী")}
        </p>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col justify-center items-center py-2">
        {!selectedRole ? (
          <div className="w-full flex justify-center px-1">
            {/* 3 Columns Grid inside max-w-lg with uniform borders */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full items-stretch">
              {(["student", "teacher", "parent"] as const).map((role, index) => {
                const user = users.find((u) => u.role === role);
                if (!user) return null;

                const badgeConfig = {
                  student: {
                    bg: "bg-emerald-600/90 text-white",
                    icon: <GraduationCap className="size-3.5 mr-1" />,
                    label: t("Student", "শিক্ষার্থী"),
                  },
                  teacher: {
                    bg: "bg-blue-600/90 text-white",
                    icon: <BookOpen className="size-3.5 mr-1" />,
                    label: t("Teacher", "শিক্ষক"),
                  },
                  parent: {
                    bg: "bg-purple-600/90 text-white",
                    icon: <Users className="size-3.5 mr-1" />,
                    label: t("Parent", "অভিভাবক"),
                  },
                };

                const badge = badgeConfig[role];

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleSelect(role)}
                    style={{
                      animation: `pop-in 400ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                      animationDelay: `${index * 60}ms`,
                    }}
                    className="tap group relative w-full rounded-2xl py-4 px-2 flex flex-col items-center justify-center text-white cursor-pointer transition-all duration-300 bg-white/10 backdrop-blur-md shadow-lg border border-white/20 hover:border-white/40 hover:bg-white/15"
                  >
                    {/* 1. Circular Avatar Container */}
                    <div className="relative mb-2.5">
                      <div className="size-16 rounded-full bg-sky-200/90 p-0.5 flex items-center justify-center overflow-hidden shadow-inner transition-transform duration-300 group-hover:scale-105">
                        {role === "student" && <StudentAvatar />}
                        {role === "teacher" && <TeacherAvatar />}
                        {role === "parent" && <ParentAvatar />}
                      </div>
                    </div>

                    {/* 2. User Name */}
                    <h3 className="text-sm sm:text-base font-bold tracking-wide text-white mb-2 truncate w-full text-center">
                      {user.name}
                    </h3>

                    {/* 3. Role Pill Badge */}
                    <div
                      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold shadow-sm ${badge.bg}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* PIN Entry Mode */
          <div className="w-full max-w-xs mx-auto space-y-4">
            <button
              type="button"
              onClick={() => setSelectedRole(null)}
              className="tap text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity duration-300 flex items-center gap-1 text-white mb-1"
            >
              <span>←</span> {t("Back", "ফিরে যান")}
            </button>

            {users
              .filter((u) => u.role === selectedRole)
              .map((user) => {
                const roleInfo = roleLabels[selectedRole];
                const roleColorMap = {
                  student: "bg-emerald-600/90 text-white",
                  teacher: "bg-blue-600/90 text-white",
                  parent: "bg-purple-600/90 text-white",
                };

                return (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5 transition-all duration-300 shadow-xl"
                    style={{
                      animation: `pop-in 400ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                    }}
                  >
                    <div className="text-center mb-4">
                      <div className="flex justify-center mb-2">
                        <div className="size-16 rounded-full bg-sky-200/90 p-0.5 flex items-center justify-center overflow-hidden shadow-inner">
                          {selectedRole === "student" && <StudentAvatar />}
                          {selectedRole === "teacher" && <TeacherAvatar />}
                          {selectedRole === "parent" && <ParentAvatar />}
                        </div>
                      </div>

                      <p className="font-bold text-lg leading-tight text-white mb-1">{user.name}</p>

                      <div
                        className={`inline-flex items-center gap-1 ${roleColorMap[selectedRole]} px-2.5 py-0.5 rounded-full text-[11px] font-semibold`}
                      >
                        <span>{roleInfo.emoji}</span>
                        <span>{t(roleInfo.en, roleInfo.bn)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <Label
                          htmlFor="login-pin"
                          className="text-[10px] font-bold uppercase opacity-80 tracking-wider text-white/90 block mb-1 text-center"
                        >
                          {t("Enter 4-digit PIN", "4-সংখ্যার PIN প্রবেশ করুন")}
                        </Label>
                        <Input
                          id="login-pin"
                          type="password"
                          inputMode="none"
                          value={pin}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setPin(value);
                            setError(null);
                          }}
                          placeholder="••••"
                          maxLength={4}
                          className="w-full text-center text-2xl tracking-[0.4em] font-semibold bg-white/15 border border-white/20 hover:border-white/30 focus:border-white/40 transition-all duration-300 focus:ring-2 focus:ring-white/10 text-white placeholder-white/40 rounded-xl py-2"
                        />
                      </div>

                      {/* Numeric Keypad */}
                      <div className="pt-1">
                        {/* Row 1: 1 2 3 */}
                        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                          {["1", "2", "3"].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleKeypadNumber(num)}
                              className="tap py-2.5 px-2 rounded-lg bg-white/12 border border-white/20 hover:bg-white/18 hover:border-white/30 transition-all duration-200 text-white font-semibold text-base shadow-sm"
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                        {/* Row 2: 4 5 6 */}
                        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                          {["4", "5", "6"].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleKeypadNumber(num)}
                              className="tap py-2.5 px-2 rounded-lg bg-white/12 border border-white/20 hover:bg-white/18 hover:border-white/30 transition-all duration-200 text-white font-semibold text-base shadow-sm"
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                        {/* Row 3: 7 8 9 */}
                        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                          {["7", "8", "9"].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleKeypadNumber(num)}
                              className="tap py-2.5 px-2 rounded-lg bg-white/12 border border-white/20 hover:bg-white/18 hover:border-white/30 transition-all duration-200 text-white font-semibold text-base shadow-sm"
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                        {/* Row 4: Clear 0 Backspace */}
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={handleKeypadClear}
                            className="tap py-2.5 px-2 rounded-lg bg-red-500/20 border border-red-400/30 hover:bg-red-500/30 hover:border-red-400/50 transition-all duration-200 text-red-200 font-semibold text-xs shadow-sm"
                          >
                            {t("Clear", "মুছুন")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleKeypadNumber("0")}
                            className="tap py-2.5 px-2 rounded-lg bg-white/12 border border-white/20 hover:bg-white/18 hover:border-white/30 transition-all duration-200 text-white font-semibold text-base shadow-sm"
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={handleKeypadBackspace}
                            className="tap py-2.5 px-2 rounded-lg bg-white/12 border border-white/20 hover:bg-white/18 hover:border-white/30 transition-all duration-200 text-white font-semibold text-xs shadow-sm"
                          >
                            {t("←", "←")}
                          </button>
                        </div>
                      </div>

                      {error && (
                        <p className="text-[11px] font-bold text-red-300 text-center animate-pop">{error}</p>
                      )}

                      <button
                        type="button"
                        onClick={handlePinSubmit}
                        disabled={pin.length !== 4}
                        className="tap hidden w-full flex items-center justify-center gap-1.5 rounded-full bg-black/25 border border-white/20 hover:bg-black/35 py-2 px-4 text-xs font-bold transition-all duration-300 disabled:opacity-40 text-white"
                      >
                        <Lock className="size-3" />
                        <span>{t("Continue", "চালিয়ে যান")}</span>
                        <ChevronRight className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Admin Button */}
      {!selectedRole && (
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={handleAdminSignIn}
            disabled={isAdminSigningIn}
            className="tap group relative inline-flex items-center justify-center size-12 rounded-full border border-primary-foreground/25 bg-primary-foreground/12 backdrop-blur-md hover:bg-primary-foreground/18 hover:border-primary-foreground/35 hover:scale-105 transition-all duration-300 disabled:opacity-40 shadow-lg"
            title={t("Admin Access", "অ্যাডমিন অ্যাক্সেস")}
          >
            <div className="absolute inset-0 rounded-full bg-primary-foreground/5 blur-sm group-hover:bg-primary-foreground/10 transition-colors duration-300" />
            <Lock className="size-5 text-primary-foreground relative opacity-85 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      )}
    </div>
  );
}