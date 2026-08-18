import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import {
  features,
  roleLabels,
  rolePresets,
  type FeatureKey,
  type Role,
} from "@/lib/access-store";
import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/$userId")({
  head: () => ({
    meta: [
      { title: "Manage Access — Wafi Admin" },
      {
        name: "description",
        content: "Manage user role and authorized access on Firestore.",
      },
      { property: "og:title", content: "Manage Access — Wafi Admin" },
      { property: "og:description", content: "Per-user role and status control." },
    ],
  }),
  component: ManageAccess,
});

const roles: Role[] = ["student", "parent", "teacher", "admin"];

interface AuthorizedUserDoc {
  email: string;
  role: Role;
  status: "active" | "invited" | "disabled" | string;
  permissions?: FeatureKey[];
  uid?: string;
  createdAt?: Timestamp | null;
}

function ManageAccess() {
  const { userId } = Route.useParams();
  const normalizedEmail = decodeURIComponent(userId).trim().toLowerCase();
  const { t } = useApp();
  const navigate = useNavigate();

  const [user, setUser] = useState<AuthorizedUserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setLoading(true);
    const docRef = doc(db, "authorizedEmails", normalizedEmail);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const rawPermissions = Array.isArray(data.permissions)
            ? (data.permissions as FeatureKey[])
            : undefined;
          setUser({
            email: data.email || snap.id,
            role: (data.role as Role) || "student",
            status: data.status || "active",
            permissions: rawPermissions,
            uid: data.uid,
            createdAt: data.createdAt || null,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load user:", err);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [normalizedEmail]);

  const handleSetRole = async (newRole: Role) => {
    if (!user) return;
    setUpdating(true);
    const newPermissions = rolePresets[newRole] || [];
    try {
      const docRef = doc(db, "authorizedEmails", normalizedEmail);
      await updateDoc(docRef, {
        role: newRole,
        permissions: newPermissions,
      });

      try {
        const usersQuery = query(
          collection(db, "users"),
          where("email", "==", normalizedEmail),
        );
        const userSnaps = await getDocs(usersQuery);
        userSnaps.forEach((snap) => {
          updateDoc(doc(db, "users", snap.id), {
            role: newRole,
            permissions: newPermissions,
          }).catch((e) => console.warn("[ADMIN] Error updating user doc role:", snap.id, e));
        });
      } catch (e) {
        console.warn("[ADMIN] Could not query /users for role update:", e);
      }

      toast.success(
        t(
          `Role updated to ${roleLabels[newRole].en}`,
          `রোল পরিবর্তন করে ${roleLabels[newRole].bn} করা হয়েছে`,
        ),
      );
    } catch (err: any) {
      console.error("Failed to update role:", err);
      toast.error(t("Failed to update role", "রোল আপডেট করতে ব্যর্থ হয়েছে"));
    } finally {
      setUpdating(false);
    }
  };

  const handleTogglePermission = async (featureKey: FeatureKey) => {
    if (!user) return;
    const currentPermissions = user.permissions ?? rolePresets[user.role] ?? [];
    const isCurrentlyEnabled = currentPermissions.includes(featureKey);
    const newPermissions: FeatureKey[] = isCurrentlyEnabled
      ? currentPermissions.filter((k) => k !== featureKey)
      : [...currentPermissions, featureKey];

    // Optimistic local state update
    setUser((prev) => (prev ? { ...prev, permissions: newPermissions } : null));

    try {
      const docRef = doc(db, "authorizedEmails", normalizedEmail);
      await updateDoc(docRef, { permissions: newPermissions });

      if (user.uid) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          await updateDoc(userDocRef, { permissions: newPermissions });
        } catch (e) {
          console.warn("[ADMIN] Could not update /users by uid:", e);
        }
      }

      try {
        const usersQuery = query(
          collection(db, "users"),
          where("email", "==", normalizedEmail),
        );
        const userSnaps = await getDocs(usersQuery);
        userSnaps.forEach((snap) => {
          if (snap.id !== user.uid) {
            updateDoc(doc(db, "users", snap.id), { permissions: newPermissions }).catch((e) =>
              console.warn("[ADMIN] Error updating user doc:", snap.id, e),
            );
          }
        });
      } catch (e) {
        console.warn("[ADMIN] Could not query /users by email:", e);
      }
    } catch (err: any) {
      console.error("Failed to update permissions:", err);
      toast.error(t("Failed to update permissions", "অনুমতি আপডেট করতে ব্যর্থ হয়েছে"));
      setUser((prev) => (prev ? { ...prev, permissions: currentPermissions } : null));
    }
  };

  const handleResetPermissions = async () => {
    if (!user) return;
    const defaultPermissions = rolePresets[user.role] || [];
    setUser((prev) => (prev ? { ...prev, permissions: defaultPermissions } : null));

    try {
      const docRef = doc(db, "authorizedEmails", normalizedEmail);
      await updateDoc(docRef, { permissions: defaultPermissions });

      if (user.uid) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          await updateDoc(userDocRef, { permissions: defaultPermissions });
        } catch (e) {
          console.warn("[ADMIN] Could not update /users by uid:", e);
        }
      }

      try {
        const usersQuery = query(
          collection(db, "users"),
          where("email", "==", normalizedEmail),
        );
        const userSnaps = await getDocs(usersQuery);
        userSnaps.forEach((snap) => {
          updateDoc(doc(db, "users", snap.id), { permissions: defaultPermissions }).catch((e) =>
            console.warn("[ADMIN] Error updating user doc:", snap.id, e),
          );
        });
      } catch (e) {
        console.warn("[ADMIN] Could not query /users by email:", e);
      }

      toast.success(
        t(
          `Reset permissions to ${roleLabels[user.role].en} defaults`,
          `অনুমতি ${roleLabels[user.role].bn} ডিফল্টে রিসেট করা হয়েছে`,
        ),
      );
    } catch (err: any) {
      console.error("Failed to reset permissions:", err);
      toast.error(t("Failed to reset permissions", "অনুমতি রিসেট করতে ব্যর্থ হয়েছে"));
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    setUpdating(true);
    const newStatus = user.status === "disabled" ? "active" : "disabled";
    try {
      const docRef = doc(db, "authorizedEmails", normalizedEmail);
      await updateDoc(docRef, { status: newStatus });
      toast.success(
        newStatus === "active"
          ? t("Access enabled", "অ্যাক্সেস চালু করা হয়েছে")
          : t("Access disabled", "অ্যাক্সেস বন্ধ করা হয়েছে"),
      );
    } catch (err: any) {
      console.error("Failed to update status:", err);
      toast.error(t("Failed to update status", "স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে"));
    } finally {
      setUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    const confirmed = window.confirm(
      t(
        `Are you sure you want to revoke access for ${user.email}?`,
        `আপনি কি নিশ্চিত যে ${user.email}-এর অ্যাক্সেস বাতিল করতে চান?`,
      ),
    );
    if (!confirmed) return;

    try {
      const docRef = doc(db, "authorizedEmails", normalizedEmail);
      await deleteDoc(docRef);
      toast.success(t("User access revoked", "ইউজারের অ্যাক্সেস বাতিল করা হয়েছে"));
      navigate({ to: "/admin" });
    } catch (err: any) {
      console.error("Failed to remove user:", err);
      toast.error(t("Failed to revoke access", "অ্যাক্সেস বাতিল ব্যর্থ হয়েছে"));
    }
  };

  if (loading) {
    return (
      <PageShell title={t("Manage User", "ইউজার পরিচালনা")} back="/admin">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">
            {t("Loading user profile...", "ইউজার প্রোফাইল লোড হচ্ছে...")}
          </p>
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell title={t("User not found", "ইউজার পাওয়া যায়নি")} back="/admin">
        <SectionCard>
          <p className="text-sm text-muted-foreground">
            {t(
              "This user is not authorized or was removed.",
              "এই ইউজার অনুমোদিত নয় অথবা সরিয়ে ফেলা হয়েছে।",
            )}
          </p>
          <Link to="/admin" className="mt-3 block text-sm font-bold text-primary">
            {t("Back to admin", "অ্যাডমিনে ফিরে যান")} →
          </Link>
        </SectionCard>
      </PageShell>
    );
  }

  const userPermissions = user.permissions ?? rolePresets[user.role] ?? [];
  const defaultSet = new Set(rolePresets[user.role] || []);
  const currentSet = new Set(user.permissions || []);
  const hasCustom =
    Boolean(user.permissions) &&
    (defaultSet.size !== currentSet.size ||
      [...defaultSet].some((k) => !currentSet.has(k)));

  return (
    <PageShell
      title={user.email}
      subtitle={t("Authorized User", "অনুমোদিত ব্যবহারকারী")}
      back="/admin"
    >
      <SectionCard title={t("Role", "রোল")}>
        <div className="grid grid-cols-4 gap-2">
          {roles.map((r) => (
            <button
              key={r}
              disabled={updating}
              onClick={() => handleSetRole(r)}
              className={`tap rounded-2xl px-1.5 py-2.5 text-[11px] font-bold transition-all disabled:opacity-50 ${
                user.role === r
                  ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                  : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              <span className="text-base">{roleLabels[r].emoji}</span>
              <span className="mt-1 block leading-tight">
                {t(roleLabels[r].en, roleLabels[r].bn)}
              </span>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Feature Permissions Toggles */}
      <SectionCard
        title={t("Feature Permissions", "ফিচার অনুমতি")}
        hint={
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {userPermissions.length} / {features.length}
            </span>
            {hasCustom && (
              <button
                type="button"
                onClick={handleResetPermissions}
                className="tap inline-flex items-center gap-1 text-[11px] font-bold text-primary transition-opacity hover:opacity-80"
              >
                <RotateCcw className="size-3" />
                <span>{t("Reset", "রিসেট")}</span>
              </button>
            )}
          </div>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {features.map((feat) => {
            const isEnabled = userPermissions.includes(feat.key);
            return (
              <button
                key={feat.key}
                type="button"
                onClick={() => handleTogglePermission(feat.key)}
                aria-pressed={isEnabled}
                title={
                  isEnabled
                    ? t(`Disable ${feat.en}`, `${feat.bn} বন্ধ করুন`)
                    : t(`Enable ${feat.en}`, `${feat.bn} চালু করুন`)
                }
                className={`tap inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all select-none ${
                  isEnabled
                    ? "border-primary/40 bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90 active:scale-95"
                    : "border-border/50 bg-card/40 text-muted-foreground/60 opacity-60 hover:border-border hover:bg-card hover:opacity-100 hover:text-foreground active:scale-95"
                }`}
              >
                <span className={`text-xs ${isEnabled ? "" : "grayscale opacity-75"}`}>
                  {feat.emoji}
                </span>
                <span className="leading-none">{t(feat.en, feat.bn)}</span>
                {isEnabled ? (
                  <Check className="size-3 stroke-[2.5]" />
                ) : (
                  <Plus className="size-3 opacity-60" />
                )}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title={t("Account Status", "অ্যাকাউন্ট স্ট্যাটাস")}>
        <div className="mb-3 flex gap-2">
          <Pill
            tone={
              user.status === "active"
                ? "success"
                : user.status === "invited"
                  ? "warning"
                  : "destructive"
            }
          >
            {user.status === "active"
              ? t("Active", "সক্রিয়")
              : user.status === "invited"
                ? t("Invited", "আমন্ত্রিত")
                : t("Disabled", "বন্ধ")}
          </Pill>
          <Pill tone="primary">
            {t(roleLabels[user.role]?.en || user.role, roleLabels[user.role]?.bn || user.role)}
          </Pill>
          {hasCustom && (
            <Pill tone="accent">
              {t("Customized", "কাস্টমাইজড")}
            </Pill>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleToggleStatus}
            disabled={updating}
            className="tap flex-1 rounded-2xl bg-muted py-3 text-sm font-bold transition-colors hover:bg-muted/80 disabled:opacity-50"
          >
            {user.status === "disabled"
              ? t("Enable access", "অ্যাক্সেস চালু করুন")
              : t("Disable access", "অ্যাক্সেস বন্ধ করুন")}
          </button>
          <button
            onClick={handleRemove}
            disabled={updating}
            className="tap grid size-12 place-items-center rounded-2xl bg-destructive/12 text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
            aria-label="Remove user"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </SectionCard>
    </PageShell>
  );
}