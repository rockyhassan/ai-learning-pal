import { Link, useRouterState } from "@tanstack/react-router";
import { Lock, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "@/lib/app-state";
import { features, useAccess } from "@/lib/access-store";
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
  const { currentUser, authReady } = useAccess();

  if (isPublicRoute(pathname)) return <>{children}</>;
  if (!authReady) return <div className="min-h-screen bg-background" />;

  if (!currentUser || currentUser.status === "disabled") {
    return (
      <Blocked
        icon={<Lock className="size-7" />}
        title={t("Sign in required", "সাইন ইন প্রয়োজন")}
        message={
          currentUser
            ? t(
                "This account has been disabled by the admin.",
                "এই অ্যাকাউন্টটি অ্যাডমিন বন্ধ করে দিয়েছেন।",
              )
            : t(
                "Please sign in with an approved email to open this page.",
                "এই পেজটি খুলতে অনুমোদিত ইমেইল দিয়ে সাইন ইন করুন।",
              )
        }
        action={
          <Link
            to="/login"
            search={{ redirect: pathname }}
            className="tap block w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            {t("Go to sign in", "সাইন ইনে যান")}
          </Link>
        }
      />
    );
  }

  const feature = featureForRoute(pathname);
  if (isSessionOnlyRoute(pathname) || !feature) return <>{children}</>;

  if (!currentUser.permissions.includes(feature)) {
    const meta = features.find((f) => f.key === feature);
    return (
      <Blocked
        icon={<ShieldAlert className="size-7" />}
        title={t("No access", "অ্যাক্সেস নেই")}
        message={t(
          `Your account (${currentUser.email}) doesn't have access to ${meta?.en ?? feature}. Ask an admin to enable it.`,
          `আপনার অ্যাকাউন্টে (${currentUser.email}) ${meta?.bn ?? feature} এর অ্যাক্সেস নেই। অ্যাডমিনকে চালু করতে বলুন।`,
        )}
        action={
          <Link
            to="/login"
            search={{ redirect: "/login" }}
            className="tap block w-full rounded-2xl bg-muted py-3 text-sm font-bold"
          >
            {t("Switch account", "অ্যাকাউন্ট বদলান")}
          </Link>
        }
      />
    );
  }

  return <>{children}</>;
}
