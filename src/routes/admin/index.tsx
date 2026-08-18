import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { features, roleLabels, rolePresets, type FeatureKey, type Role } from "@/lib/access-store";
import {
  useSchoolProfile,
  DEFAULT_SCHOOL_PROFILE,
  type SchoolProfileData,
} from "@/lib/school-profile";
import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Wafi Learning" },
      {
        name: "description",
        content:
          "Manage authorized users, roles, and school content with Firestore real-time synchronization.",
      },
      { property: "og:title", content: "Admin Dashboard — Wafi Learning" },
      {
        property: "og:description",
        content: "Email-based access control for parents, teachers, students and admins.",
      },
    ],
  }),
  component: AdminDashboard,
});

const roles: Role[] = ["student", "parent", "teacher", "admin"];

interface AuthorizedEmailItem {
  id: string;
  email: string;
  role: Role;
  status: "active" | "invited" | "disabled" | string;
  permissions?: FeatureKey[];
  uid?: string;
  createdAt?: Timestamp | null;
}

function AdminDashboard() {
  const { t } = useApp();
  const { profile: currentProfile, loading: isProfileLoading } = useSchoolProfile();
  const [profileForm, setProfileForm] = useState<SchoolProfileData>(DEFAULT_SCHOOL_PROFILE);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(true);

  const [emailInput, setEmailInput] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("parent");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<Role | "all">("all");
  const [users, setUsers] = useState<AuthorizedEmailItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);

  // Sync profile form when currentProfile loads or changes from Firestore
  useEffect(() => {
    if (currentProfile) {
      setProfileForm(currentProfile);
    }
  }, [currentProfile]);

  // Handle saving School & Student Profile to Firestore
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const docRef = doc(db, "schoolProfile", "info");
      await setDoc(
        docRef,
        {
          studentName: profileForm.studentName.trim(),
          schoolName: profileForm.schoolName.trim(),
          grade: profileForm.grade.trim(),
          section: profileForm.section.trim(),
          roll: profileForm.roll.trim(),
          curriculum: profileForm.curriculum.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast.success(
        t(
          "Student & School Profile updated successfully!",
          "শিক্ষার্থী ও স্কুলের প্রোফাইল সফলভাবে আপডেট করা হয়েছে!",
        ),
      );
    } catch (error: any) {
      console.error("[ADMIN] Error updating school profile:", error);
      toast.error(
        t(
          "Failed to update profile. Please ensure you have admin privileges.",
          "প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে। অ্যাডমিন অনুমতি নিশ্চিত করুন।",
        ),
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Real-time listener for /authorizedEmails collection
  useEffect(() => {
    setIsLoading(true);
    const colRef = collection(db, "authorizedEmails");

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items: AuthorizedEmailItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const rawPermissions = Array.isArray(data.permissions)
            ? (data.permissions as FeatureKey[])
            : undefined;
          items.push({
            id: docSnap.id,
            email: data.email || docSnap.id,
            role: (data.role as Role) || "student",
            status: data.status || "active",
            permissions: rawPermissions,
            uid: data.uid,
            createdAt: data.createdAt || null,
          });
        });

        // Sort alphabetically by email
        items.sort((a, b) => a.email.localeCompare(b.email));
        setUsers(items);
        setIsLoading(false);
      },
      (error) => {
        console.error("[ADMIN] Error listening to authorizedEmails:", error);
        toast.error(
          t(
            "Failed to load authorized users from Firestore",
            "Firestore থেকে অনুমোদিত ইউজার লোড করতে ব্যর্থ হয়েছে",
          ),
        );
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [t]);

  // Compute counts per role
  const roleCounts = useMemo(() => {
    const counts: Record<Role, number> = {
      student: 0,
      parent: 0,
      teacher: 0,
      admin: 0,
    };
    users.forEach((u) => {
      if (counts[u.role] !== undefined) {
        counts[u.role]++;
      }
    });
    return counts;
  }, [users]);

  // Filtered users list
  const filteredList = useMemo(() => {
    if (filter === "all") return users;
    return users.filter((u) => u.role === filter);
  }, [users, filter]);

  // Helper to check if a user has custom permission overrides
  const isCustomPermissions = (userItem: AuthorizedEmailItem) => {
    if (!userItem.permissions) return false;
    const defaultSet = new Set(rolePresets[userItem.role] || []);
    const currentSet = new Set(userItem.permissions);
    if (defaultSet.size !== currentSet.size) return true;
    for (const key of defaultSet) {
      if (!currentSet.has(key)) return true;
    }
    return false;
  };

  // Invite / Authorize Email Handler
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = emailInput.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      toast.error(
        t("Please enter a valid email address", "অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন"),
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const docRef = doc(db, "authorizedEmails", normalizedEmail);
      await setDoc(
        docRef,
        {
          email: normalizedEmail,
          role: selectedRole,
          status: "active",
          permissions: rolePresets[selectedRole] || [],
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );

      toast.success(
        t(
          `Authorized ${normalizedEmail} as ${roleLabels[selectedRole].en}`,
          `${normalizedEmail}-কে ${roleLabels[selectedRole].bn} হিসেবে অনুমতি দেওয়া হয়েছে`,
        ),
      );
      setEmailInput("");
    } catch (error: any) {
      console.error("[ADMIN] Error authorizing user:", error);
      toast.error(
        t(
          "Failed to authorize email. Please ensure you have admin privileges.",
          "ইমেইল অনুমোদন ব্যর্থ হয়েছে। অ্যাডমিন অনুমতি নিশ্চিত করুন।",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role Change Handler: resets permissions to new role preset
  const handleRoleChange = async (email: string, newRole: Role) => {
    const normalizedEmail = email.trim().toLowerCase();
    const newPermissions = rolePresets[newRole] || [];
    setUpdatingEmail(normalizedEmail);
    setUsers((prev) =>
      prev.map((u) =>
        u.email.toLowerCase() === normalizedEmail
          ? { ...u, role: newRole, permissions: newPermissions }
          : u,
      ),
    );

    try {
      // 1. Update /authorizedEmails/{email}
      const docRef = doc(db, "authorizedEmails", normalizedEmail);
      await updateDoc(docRef, {
        role: newRole,
        permissions: newPermissions,
      });

      // 2. Also update /users/{uid} if document exists
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
          `Updated ${normalizedEmail} to ${roleLabels[newRole].en}`,
          `${normalizedEmail}-এর রোল পরিবর্তন করে ${roleLabels[newRole].bn} করা হয়েছে`,
        ),
      );
    } catch (error: any) {
      console.error("[ADMIN] Error updating role:", error);
      toast.error(t("Failed to update role", "রোল আপডেট করতে ব্যর্থ হয়েছে"));
    } finally {
      setUpdatingEmail(null);
    }
  };

  // Toggle Single Permission Handler
  const handleTogglePermission = async (
    userItem: AuthorizedEmailItem,
    featureKey: FeatureKey,
  ) => {
    const normalizedEmail = userItem.email.trim().toLowerCase();
    const currentPermissions = userItem.permissions ?? rolePresets[userItem.role] ?? [];
    const isCurrentlyEnabled = currentPermissions.includes(featureKey);
    const newPermissions: FeatureKey[] = isCurrentlyEnabled
      ? currentPermissions.filter((k) => k !== featureKey)
      : [...currentPermissions, featureKey];

    // Optimistic local state update
    setUsers((prev) =>
      prev.map((u) =>
        u.email.toLowerCase() === normalizedEmail ? { ...u, permissions: newPermissions } : u,
      ),
    );

    try {
      // 1. Update /authorizedEmails/{email}
      const docRef = doc(db, "authorizedEmails", normalizedEmail);
      await updateDoc(docRef, {
        permissions: newPermissions,
      });

      // 2. If user already has a document in /users/{uid}, also update /users/{uid}.permissions
      if (userItem.uid) {
        try {
          const userDocRef = doc(db, "users", userItem.uid);
          await updateDoc(userDocRef, { permissions: newPermissions });
        } catch (e) {
          console.warn("[ADMIN] Could not update /users by uid:", e);
        }
      }

      // Also query /users by email in case uid was not stored
      try {
        const usersQuery = query(
          collection(db, "users"),
          where("email", "==", normalizedEmail),
        );
        const userSnaps = await getDocs(usersQuery);
        userSnaps.forEach((snap) => {
          if (snap.id !== userItem.uid) {
            updateDoc(doc(db, "users", snap.id), { permissions: newPermissions }).catch((e) =>
              console.warn("[ADMIN] Error updating user doc:", snap.id, e),
            );
          }
        });
      } catch (e) {
        console.warn("[ADMIN] Could not query /users by email:", e);
      }
    } catch (error: any) {
      console.error("[ADMIN] Error updating permissions:", error);
      toast.error(t("Failed to update permissions", "অনুমতি আপডেট করতে ব্যর্থ হয়েছে"));
      // Revert optimistic update on failure
      setUsers((prev) =>
        prev.map((u) =>
          u.email.toLowerCase() === normalizedEmail
            ? { ...u, permissions: currentPermissions }
            : u,
        ),
      );
    }
  };

  // Reset permissions to role presets
  const handleResetPermissions = async (userItem: AuthorizedEmailItem) => {
    const normalizedEmail = userItem.email.trim().toLowerCase();
    const defaultPermissions = rolePresets[userItem.role] || [];

    setUsers((prev) =>
      prev.map((u) =>
        u.email.toLowerCase() === normalizedEmail ? { ...u, permissions: defaultPermissions } : u,
      ),
    );

    try {
      const docRef = doc(db, "authorizedEmails", normalizedEmail);
      await updateDoc(docRef, {
        permissions: defaultPermissions,
      });

      if (userItem.uid) {
        try {
          const userDocRef = doc(db, "users", userItem.uid);
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
          `Reset permissions for ${normalizedEmail} to ${roleLabels[userItem.role].en} defaults`,
          `${normalizedEmail}-এর অনুমতি ${roleLabels[userItem.role].bn} ডিফল্টে রিসেট করা হয়েছে`,
        ),
      );
    } catch (error: any) {
      console.error("[ADMIN] Error resetting permissions:", error);
      toast.error(t("Failed to reset permissions", "অনুমতি রিসেট করতে ব্যর্থ হয়েছে"));
    }
  };

  // Revoke Access Handler
  const handleRevoke = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const confirmed = window.confirm(
      t(
        `Are you sure you want to revoke access for ${normalizedEmail}? This user will no longer be able to sign in.`,
        `আপনি কি নিশ্চিত যে ${normalizedEmail}-এর অ্যাক্সেস বাতিল করতে চান? এই ইউজার আর সাইন ইন করতে পারবেন না।`,
      ),
    );

    if (!confirmed) return;

    setRevokingEmail(normalizedEmail);
    try {
      const docRef = doc(db, "authorizedEmails", normalizedEmail);
      await deleteDoc(docRef);

      toast.success(
        t(
          `Revoked access for ${normalizedEmail}`,
          `${normalizedEmail}-এর অ্যাক্সেস বাতিল করা হয়েছে`,
        ),
      );
    } catch (error: any) {
      console.error("[ADMIN] Error revoking access:", error);
      toast.error(t("Failed to revoke access", "অ্যাক্সেস বাতিল করতে ব্যর্থ হয়েছে"));
    } finally {
      setRevokingEmail(null);
    }
  };

  return (
    <PageShell
      title={t("Admin Dashboard", "অ্যাডমিন ড্যাশবোর্ড")}
      subtitle={t("Users, roles & school content", "ইউজার, রোল ও স্কুল কনটেন্ট")}
    >
      {/* Role Counts Summary */}
      <SectionCard className="gradient-card">
        <div className="grid grid-cols-4 gap-2 text-center">
          {roles.map((r) => (
            <div key={r} className="rounded-2xl bg-card/70 p-2 shadow-xs">
              <p className="text-lg font-extrabold text-primary">{roleCounts[r]}</p>
              <p className="text-[10px] leading-tight text-muted-foreground">
                {t(roleLabels[r].en, roleLabels[r].bn)}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* School Content Shortcuts */}
      <SectionCard title={t("School content", "স্কুল কনটেন্ট")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Link to="/admin/diary" className="tap rounded-2xl bg-muted p-3">
            <span className="text-xl">📔</span>
            <p className="mt-1 text-sm font-bold">{t("School Diary", "স্কুল ডায়েরি")}</p>
            <p className="text-[11px] text-muted-foreground">
              {t("Add, paste, edit, delete", "যোগ, পেস্ট, এডিট, ডিলিট")}
            </p>
          </Link>
          <Link to="/admin/routine" className="tap rounded-2xl bg-muted p-3">
            <span className="text-xl">📅</span>
            <p className="mt-1 text-sm font-bold">{t("Class Routine", "ক্লাস রুটিন")}</p>
            <p className="text-[11px] text-muted-foreground">
              {t("Add, edit, delete periods", "পিরিয়ড যোগ, এডিট, ডিলিট")}
            </p>
          </Link>
          <Link to="/admin/exams" className="tap rounded-2xl bg-muted p-3">
            <span className="text-xl">📝</span>
            <p className="mt-1 text-sm font-bold">{t("Exams", "পরীক্ষা")}</p>
            <p className="text-[11px] text-muted-foreground">
              {t("Add, edit, delete exams", "পরীক্ষা যোগ, এডিট, ডিলিট")}
            </p>
          </Link>
        </div>
      </SectionCard>

      {/* Edit Student & School Profile Section */}
      <SectionCard
        title={
          <div className="flex items-center gap-2">
            <GraduationCap className="size-4 text-primary" />
            <span>{t("Edit Student & School Profile", "শিক্ষার্থী ও স্কুলের প্রোফাইল সম্পাদনা")}</span>
          </div>
        }
        hint={
          <button
            type="button"
            onClick={() => setIsProfileCardOpen((prev) => !prev)}
            className="tap inline-flex items-center gap-1 text-xs font-semibold text-primary transition-opacity hover:opacity-80"
          >
            <span>
              {isProfileCardOpen
                ? t("Collapse", "সংকোচন")
                : t("Expand", "প্রসারণ")}
            </span>
            {isProfileCardOpen ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        }
      >
        {isProfileCardOpen && (
          <form className="space-y-3.5" onSubmit={handleSaveProfile}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t("Student Full Name", "শিক্ষার্থীর পূর্ণ নাম")}
                </label>
                <input
                  value={profileForm.studentName}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, studentName: e.target.value }))
                  }
                  type="text"
                  required
                  placeholder={t(
                    "e.g. Muhammad Affan Hassan Wafi",
                    "যেমন: মুহাম্মদ আফফান হাসান ওয়াফি",
                  )}
                  className="w-full rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t("School Name", "স্কুলের নাম")}
                </label>
                <input
                  value={profileForm.schoolName}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, schoolName: e.target.value }))
                  }
                  type="text"
                  required
                  placeholder={t("e.g. KCIS", "যেমন: KCIS")}
                  className="w-full rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t("Grade / Class", "শ্রেণি / ক্লাস")}
                </label>
                <input
                  value={profileForm.grade}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, grade: e.target.value }))
                  }
                  type="text"
                  required
                  placeholder={t("e.g. Grade-3", "যেমন: Grade-3")}
                  className="w-full rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t("Section", "শাখা")}
                </label>
                <input
                  value={profileForm.section}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, section: e.target.value }))
                  }
                  type="text"
                  required
                  placeholder={t("e.g. Section A", "যেমন: Section A")}
                  className="w-full rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t("Roll Number", "রোল নম্বর")}
                </label>
                <input
                  value={profileForm.roll}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, roll: e.target.value }))
                  }
                  type="text"
                  required
                  placeholder={t("e.g. 08", "যেমন: 08")}
                  className="w-full rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">
                  {t("Curriculum / System", "কারিকুলাম / মাধ্যম")}
                </label>
                <input
                  value={profileForm.curriculum}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, curriculum: e.target.value }))
                  }
                  type="text"
                  required
                  placeholder={t(
                    "e.g. NCTB (English Version)",
                    "যেমন: NCTB (English Version)",
                  )}
                  className="w-full rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-muted-foreground">
                {t(
                  "Changes here instantly synchronize across Student, Parent, and Teacher views in real-time.",
                  "এখানে পরিবর্তন করলে শিক্ষার্থী, অভিভাবক ও শিক্ষক ভিউতে তাৎক্ষণিকভাবে আপডেট হবে।",
                )}
              </p>
              <button
                type="submit"
                disabled={isSavingProfile || isProfileLoading}
                className="tap flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-50 sm:w-auto"
              >
                {isSavingProfile ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {t("Save Profile", "প্রোফাইল সংরক্ষণ করুন")}
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      {/* Authorize New User Form */}
      <SectionCard title={t("Authorize access by email", "ইমেইল দিয়ে অ্যাক্সেস অনুমোদন করুন")}>
        <form className="space-y-3" onSubmit={handleInviteSubmit}>
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">
              {t("User Google Account Email", "ইউজারের গুগল অ্যাকাউন্ট ইমেইল")}
            </label>
            <input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              type="email"
              required
              placeholder={t("e.g. parent@gmail.com", "যেমন: parent@gmail.com")}
              className="w-full rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
              {t("Assign Role", "রোল নির্বাচন করুন")}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`tap rounded-2xl px-1.5 py-2.5 text-[11px] font-bold transition-all ${
                    selectedRole === r
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
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !emailInput.trim()}
            className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            {t("Authorize User", "ইউজার অনুমোদন করুন")}
          </button>

          <p className="text-[11px] text-muted-foreground">
            {t(
              "When this person signs in with their Google account, Firestore will automatically grant them access based on this role and permissions.",
              "এই ব্যক্তি যখন তার গুগল অ্যাকাউন্ট দিয়ে সাইন ইন করবেন, Firestore স্বয়ংক্রিয়ভাবে এই রোল ও অনুমতির ভিত্তিতে অ্যাক্সেস প্রদান করবে।",
            )}
          </p>
        </form>
      </SectionCard>

      {/* Authorized Users List */}
      <SectionCard
        title={t("Authorized Users", "অনুমোদিত ব্যবহারকারী")}
        hint={
          <span className="text-xs font-semibold text-muted-foreground">
            {users.length} {t("total", "মোট")}
          </span>
        }
      >
        {/* Role Filters */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(["all", ...roles] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFilter(r)}
              className={`tap rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                filter === r
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "all"
                ? `${t("All", "সব")} (${users.length})`
                : `${t(roleLabels[r].en, roleLabels[r].bn)} (${roleCounts[r]})`}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="mt-2 text-xs font-semibold">
              {t("Loading authorized users...", "অনুমোদিত ইউজার লোড হচ্ছে...")}
            </p>
          </div>
        ) : filteredList.length === 0 ? (
          /* Empty State */
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-8 text-center">
            <Users className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-semibold text-foreground">
              {filter === "all"
                ? t("No authorized users found", "কোনো অনুমোদিত ইউজার পাওয়া যায়নি")
                : t(
                    `No ${roleLabels[filter as Role].en.toLowerCase()}s found`,
                    `কোনো ${roleLabels[filter as Role].bn} পাওয়া যায়নি`,
                  )}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t(
                "Authorize email addresses above to give them access.",
                "অ্যাক্সেস দিতে উপরে ইমেইল ঠিকানা অনুমোদন করুন।",
              )}
            </p>
          </div>
        ) : (
          /* Users List */
          <ul className="space-y-3">
            {filteredList.map((u) => {
              const isUpdating = updatingEmail === u.email;
              const isRevoking = revokingEmail === u.email;
              const userPermissions = u.permissions ?? rolePresets[u.role] ?? [];
              const hasCustom = isCustomPermissions(u);
              const enabledCount = userPermissions.length;

              return (
                <li
                  key={u.id}
                  className="flex flex-col gap-3 rounded-2xl bg-muted p-3.5 transition-all"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-card text-lg shadow-xs">
                        {roleLabels[u.role]?.emoji || "👤"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">{u.email}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Pill
                            tone={
                              u.status === "active"
                                ? "success"
                                : u.status === "invited"
                                  ? "warning"
                                  : "destructive"
                            }
                          >
                            {u.status === "active"
                              ? t("Active", "সক্রিয়")
                              : u.status === "invited"
                                ? t("Invited", "আমন্ত্রিত")
                                : t("Disabled", "বন্ধ")}
                          </Pill>
                          <Pill tone="primary">
                            {t(roleLabels[u.role]?.en || u.role, roleLabels[u.role]?.bn || u.role)}
                          </Pill>
                          {hasCustom && (
                            <Pill tone="accent">
                              {t("Customized", "কাস্টমাইজড")}
                            </Pill>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Role Selector Dropdown + Revoke Button */}
                    <div className="mt-1 flex items-center justify-end gap-2 sm:mt-0">
                      <div className="relative">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.email, e.target.value as Role)}
                          disabled={isUpdating || isRevoking}
                          className="cursor-pointer rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground outline-none transition-colors hover:border-primary focus:border-primary disabled:opacity-50"
                          aria-label={t("Change role", "রোল পরিবর্তন করুন")}
                        >
                          {roles.map((r) => (
                            <option key={r} value={r}>
                              {roleLabels[r].emoji} {t(roleLabels[r].en, roleLabels[r].bn)}
                            </option>
                          ))}
                        </select>
                        {isUpdating && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-card/80">
                            <Loader2 className="size-3.5 animate-spin text-primary" />
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevoke(u.email)}
                        disabled={isRevoking || isUpdating}
                        className="tap grid size-8 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                        title={t("Revoke access", "অ্যাক্সেস বাতিল করুন")}
                        aria-label={t("Revoke access", "অ্যাক্সেস বাতিল করুন")}
                      >
                        {isRevoking ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Interactive Feature Permission Chips */}
                  <div className="border-t border-border/60 pt-2.5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t("Permissions", "অনুমতি")}
                        </span>
                        <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-2xs">
                          {enabledCount} / {features.length}
                        </span>
                      </div>

                      {hasCustom && (
                        <button
                          type="button"
                          onClick={() => handleResetPermissions(u)}
                          className="tap inline-flex items-center gap-1 text-[11px] font-bold text-primary transition-opacity hover:opacity-80"
                          title={t(
                            "Reset to role default permissions",
                            "রোল ডিফল্ট অনুমতিতে রিসেট করুন",
                          )}
                        >
                          <RotateCcw className="size-3" />
                          <span>{t("Reset defaults", "ডিফল্ট রিসেট")}</span>
                        </button>
                      )}
                    </div>

                    {/* All 19 Feature Toggles */}
                    <div className="flex flex-wrap gap-1.5">
                      {features.map((feat) => {
                        const isEnabled = userPermissions.includes(feat.key);
                        return (
                          <button
                            key={feat.key}
                            type="button"
                            onClick={() => handleTogglePermission(u, feat.key)}
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
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </PageShell>
  );
}