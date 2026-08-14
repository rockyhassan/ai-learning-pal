import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Trash2 } from "lucide-react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { features, roleLabels, rolePresets, useAccess, type Role } from "@/lib/access-store";

export const Route = createFileRoute("/admin/$userId")({
  head: () => ({
    meta: [
      { title: "Manage Access — Wafi Admin" },
      {
        name: "description",
        content: "Change a user's role and pick exactly which app options their email can open.",
      },
      { property: "og:title", content: "Manage Access — Wafi Admin" },
      { property: "og:description", content: "Per-user role and per-option permissions." },
    ],
  }),
  component: ManageAccess,
});

const roles: Role[] = ["student", "parent", "teacher", "admin"];

function ManageAccess() {
  const { userId } = Route.useParams();
  const { t } = useApp();
  const { users, togglePermission, setRole, toggleStatus, remove } = useAccess();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return (
      <PageShell title={t("User not found", "ইউজার পাওয়া যায়নি")} back="/admin">
        <SectionCard>
          <p className="text-sm text-muted-foreground">
            {t("This user was removed.", "এই ইউজারকে সরিয়ে ফেলা হয়েছে।")}
          </p>
          <Link to="/admin" className="mt-3 block text-sm font-bold text-primary">
            {t("Back to admin", "অ্যাডমিনে ফিরে যান")} →
          </Link>
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <PageShell title={user.name} subtitle={user.email} back="/admin">
      <SectionCard title={t("Role", "রোল")}>
        <div className="grid grid-cols-4 gap-2">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setRole(user.id, r)}
              className={`tap rounded-2xl px-1 py-2 text-[11px] font-bold ${
                user.role === r ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {roleLabels[r].emoji}
              <span className="mt-0.5 block leading-tight">
                {t(roleLabels[r].en, roleLabels[r].bn)}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t(
            "Changing the role resets the options below to that role's default.",
            "রোল বদলালে নিচের অপশনগুলো ঐ রোলের ডিফল্টে ফিরে যাবে।",
          )}
        </p>
      </SectionCard>

      <SectionCard
        title={t("Option access", "অপশন অ্যাক্সেস")}
        hint={
          <button
            onClick={() =>
              rolePresets[user.role].forEach((k) => {
                if (!user.permissions.includes(k)) togglePermission(user.id, k);
              })
            }
            className="text-xs font-bold text-primary"
          >
            {t("Reset to default", "ডিফল্টে ফিরুন")}
          </button>
        }
      >
        <ul className="space-y-1.5">
          {features.map((f) => {
            const on = user.permissions.includes(f.key);
            return (
              <li key={f.key}>
                <button
                  onClick={() => togglePermission(user.id, f.key)}
                  className="tap flex w-full items-center gap-3 rounded-2xl bg-muted px-3 py-2.5 text-left"
                >
                  <span className="text-base">{f.emoji}</span>
                  <span className="flex-1 text-sm font-semibold">{t(f.en, f.bn)}</span>
                  <span
                    className={`grid h-6 w-11 place-items-center rounded-full px-0.5 transition-colors ${
                      on ? "bg-success/80" : "bg-border"
                    }`}
                  >
                    <span
                      className={`grid size-5 place-items-center rounded-full bg-card transition-transform ${
                        on ? "translate-x-2.5" : "-translate-x-2.5"
                      }`}
                    >
                      {on ? <Check className="size-3 text-success" /> : null}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <SectionCard title={t("Account", "অ্যাকাউন্ট")}>
        <div className="mb-3 flex gap-2">
          <Pill tone={user.status === "active" ? "success" : user.status === "invited" ? "warning" : "destructive"}>
            {user.status === "active"
              ? t("Active", "সক্রিয়")
              : user.status === "invited"
                ? t("Invited", "ইনভাইটেড")
                : t("Disabled", "বন্ধ")}
          </Pill>
          <Pill>
            {user.permissions.length}/{features.length} {t("options", "অপশন")}
          </Pill>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleStatus(user.id)}
            className="tap flex-1 rounded-2xl bg-muted py-3 text-sm font-bold"
          >
            {user.status === "disabled" ? t("Enable access", "অ্যাক্সেস চালু") : t("Disable access", "অ্যাক্সেস বন্ধ")}
          </button>
          <button
            onClick={() => remove(user.id)}
            className="tap grid size-12 place-items-center rounded-2xl bg-destructive/12 text-destructive"
            aria-label="Remove user"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </SectionCard>
    </PageShell>
  );
}