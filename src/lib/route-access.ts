import type { FeatureKey } from "./access-store";

/** Routes anyone can open, signed in or not. */
export const publicRoutes = ["/", "/signup", "/login", "/student-setup"];

/** Routes any signed-in user can open, whatever their permissions. */
export const sessionOnlyRoutes = ["/profile", "/settings"];

const rules: { prefix: string; feature: FeatureKey }[] = [
  { prefix: "/admin", feature: "admin" },
  { prefix: "/parent-dashboard", feature: "parent-mode" },
  { prefix: "/parent-mode", feature: "parent-mode" },
  { prefix: "/dashboard", feature: "dashboard" },
  { prefix: "/study", feature: "study" },
  { prefix: "/lesson", feature: "study" },
  { prefix: "/homework", feature: "homework" },
  { prefix: "/ai-teacher", feature: "ai-teacher" },
  { prefix: "/scan", feature: "scan" },
  { prefix: "/vocabulary", feature: "vocabulary" },
  { prefix: "/pronunciation", feature: "pronunciation" },
  { prefix: "/question-bank", feature: "question-bank" },
  { prefix: "/practice", feature: "practice" },
  { prefix: "/games", feature: "games" },
  { prefix: "/progress", feature: "progress" },
  { prefix: "/planner", feature: "planner" },
  { prefix: "/notifications", feature: "notifications" },
  { prefix: "/documents", feature: "documents" },
  { prefix: "/achievements", feature: "achievements" },
  { prefix: "/ai-memory", feature: "ai-memory" },
  { prefix: "/school-profile", feature: "school-profile" },
];

export function isPublicRoute(pathname: string) {
  const p = normalize(pathname);
  return publicRoutes.includes(p);
}

export function isSessionOnlyRoute(pathname: string) {
  const p = normalize(pathname);
  return sessionOnlyRoutes.includes(p);
}

export function featureForRoute(pathname: string): FeatureKey | null {
  const p = normalize(pathname);
  return rules.find((r) => p === r.prefix || p.startsWith(`${r.prefix}/`))?.feature ?? null;
}

function normalize(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}
