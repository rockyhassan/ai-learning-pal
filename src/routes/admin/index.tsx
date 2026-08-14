import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, UserPlus } from "lucide-react";
import { useState } from "react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { roleLabels, useAccess, type Role } from "@/lib/access-store";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Wafi Learning" },
      {
        name: "description",
        content:
          "Invite parents, teachers and students by email and control exactly which app options each of them can access.",
      },
      { property: "og:title", content: "Admin Dashboard — Wafi Learning" },
      {
        property: "og:description",
        content: "Email-based access control for parents, teachers and students.",
      },
    ],
  }),
  component: AdminDashboard,
});

const roles: Role[] = ["student", "parent", "teacher", "admin"];

function AdminDashboard() {
  const { t } = useApp();
  const { users, invite } = useAccess();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("parent");
  const [filter, setFilter] = useState<Role | "all">("all");

  const list = filter === "all" ? users : users.filter((u) => u.role === filter);

  return (
    <PageShell
      title={t("Admin Dashboard", "অ্যাডমিন ড্যাশবোর্ড")}
      subtitle={t("Users, roles & feature access", "ইউজার, রোল ও ফিচার অ্যাক্সেস")}
    >
      <SectionCard className="gradient-card">
        <div className="grid grid-cols-4 gap-2 text-center">
          {roles.map((r) => (
            <div key={r} className="rounded-2xl bg-card/70 p-2">
              <p className="text-lg font-extrabold text-primary">
                {users.filter((u) => u.role === r).length}
              </p>
              <p className="text-[10px] leading-tight text-muted-foreground">
                {t(roleLabels[r].en, roleLabels[r].bn)}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("Give access by email", "ইমেইল দিয়ে অ্যাক্সেস দিন")}>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.includes("@")) return;
            invite({ name, email, role });
            setName("");
            setEmail("");
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Full name", "পুরো নাম")}
            className="w-full rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm outline-none"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder={t("Email address", "ইমেইল ঠিকানা")}
            className="w-full rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm outline-none"
          />
          <div className="grid grid-cols-4 gap-2">
            {roles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`tap rounded-2xl px-1 py-2 text-[11px] font-bold ${
                  role === r ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {roleLabels[r].emoji}
                <span className="mt-0.5 block leading-tight">
                  {t(roleLabels[r].en, roleLabels[r].bn)}
                </span>
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            <UserPlus className="size-4" />
            {t("Send invite", "ইনভাইট পাঠান")}
          </button>
          <p className="text-[11px] text-muted-foreground">
            {t(
              "The invited person signs in with this email and gets the default options for their role. You can fine-tune each option below.",
              "এই ইমেইল দিয়ে লগইন করলে সে তার রোলের ডিফল্ট অপশনগুলো পাবে। নিচে প্রতিটি অপশন আলাদা করে ঠিক করতে পারবেন।",
            )}
          </p>
        </form>
      </SectionCard>

      <SectionCard title={t("People", "সবাই")}>
        <div className="mb-3 flex flex-wrap gap-2">
          {(["all", ...roles] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`tap rounded-full px-3 py-1.5 text-[11px] font-bold ${
                filter === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {r === "all" ? t("All", "সব") : t(roleLabels[r].en, roleLabels[r].bn)}
            </button>
          ))}
        </div>
        <ul className="space-y-2">
          {list.map((u) => (
            <li key={u.id}>
              <Link
                to="/admin/$userId"
                params={{ userId: u.id }}
                className="tap flex items-center gap-3 rounded-2xl bg-muted px-3 py-2.5"
              >
                <span className="grid size-10 place-items-center rounded-2xl bg-card text-base">
                  {roleLabels[u.role].emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{u.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                  <div className="mt-1 flex gap-1.5">
                    <Pill tone="primary">{t(roleLabels[u.role].en, roleLabels[u.role].bn)}</Pill>
                    <Pill tone={u.status === "active" ? "success" : u.status === "invited" ? "warning" : "destructive"}>
                      {u.status === "active"
                        ? t("Active", "সক্রিয়")
                        : u.status === "invited"
                          ? t("Invited", "ইনভাইটেড")
                          : t("Disabled", "বন্ধ")}
                    </Pill>
                    <Pill>{u.permissions.length} {t("options", "অপশন")}</Pill>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>
    </PageShell>
  );
}