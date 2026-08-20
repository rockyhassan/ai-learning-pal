import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/app-state";
import { useAccess } from "@/lib/access-store";
import { featureForRoute, isPublicRoute, isSessionOnlyRoute } from "@/lib/route-access";

function Blocked({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  action: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <div className="grid size-16 place-items-center rounded-3xl bg-secondary text-primary">
        {icon}
      </div>
      <h1 className="text-lg font-extrabold">{title}</h1>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      <div className="mt-2 w-full max-w-xs">{action}</div>
    </div>
  );
}

export function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useApp();
  const { currentUser, authReady, signOut } = useAccess();

  const isPublic = isPublicRoute(pathname);
  const isSessionOnly = isSessionOnlyRoute(pathname);
  const feature = featureForRoute(pathname);
  const isUnauthorized =
    authReady &&
    !!currentUser &&
    currentUser.status !== "disabled" &&
    !isPublic &&
    !isSessionOnly &&
    !!feature &&
    !currentUser.permissions.includes(feature);

  useEffect(() => {
    if (isUnauthorized) {
      toast.error(
        t(
          "You do not have permission to access this page",
          "আপনার এই পেজে প্রবেশের অনুমতি নেই",
        ),
      );
    }
  }, [isUnauthorized, pathname, t]);

  // 1. Public & Loading States
  if (isPublic) return <>{children}</>;
  if (!authReady) return <div className="min-h-screen bg-canvas" />;

  // 2. Unauthenticated or Disabled State
  if (!currentUser) {
    return (
      <Blocked
        icon={<Lock className="size-7" />}
        title={t("Sign in required", "সাইন ইন প্রয়োজন")}
        message={t(
          "Please sign in with an approved email to open this page.",
          "এই পেজটি খুলতে অনুমোদিত ইমেইল দিয়ে সাইন ইন করুন।",
        )}
        action={
          <Link
            to="/"
            search={{ redirect: pathname }}
            className="tap block w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            {t("Go to sign in", "সাইন ইনে যান")}
          </Link>
        }
      />
    );
  }

  if (currentUser.status === "disabled") {
    return (
      <Blocked
        icon={<Lock className="size-7" />}
        title={t("Account disabled", "অ্যাকাউন্ট নিষ্ক্রিয়")}
        message={t(
          "This account has been disabled by the admin.",
          "এই অ্যাকাউন্টটি অ্যাডমিন বন্ধ করে দিয়েছেন।",
        )}
        action={
          <button
            type="button"
            onClick={() => signOut()}
            className="tap block w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            {t("Sign out", "সাইন আউট")}
          </button>
        }
      />
    );
  }

  // 3. Feature Permission & Fallback Redirection
  if (isSessionOnly || !feature) return <>{children}</>;

  if (!currentUser.permissions.includes(feature)) {
    if (pathname !== "/dashboard") {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
