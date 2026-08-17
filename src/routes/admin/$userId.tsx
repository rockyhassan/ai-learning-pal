import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Trash2 } from "lucide-react";
import { useState } from "react";
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
  const { users, togglePermission, setRole, toggleStatus, remove, changePIN, resetPIN } = useAccess();
  const user = users.find((u) => u.id === userId);

  // State for PIN change dialog
  const [showChangePINDialog, setShowChangePINDialog] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  // State for PIN reset
  const [showResetPINConfirm, setShowResetPINConfirm] = useState(false);
  const [resetPINValue, setResetPINValue] = useState<string | null>(null);
  const [showResetPINDisplay, setShowResetPINDisplay] = useState(false);

  const handleChangePINSubmit = () => {
    setPinError(null);
    setPinSuccess(false);

    if (!newPin || newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setPinError(t("PIN must be exactly 4 digits", "পিন হতে হবে ঠিক ৪ সংখ্যা"));
      return;
    }

    if (newPin !== confirmPin) {
      setPinError(t("PINs do not match", "পিনগুলো মিলছে না"));
      return;
    }

    if (!user) return;

    changePIN(user.id, newPin);
    setPinSuccess(true);
    setNewPin("");
    setConfirmPin("");

    setTimeout(() => {
      setShowChangePINDialog(false);
      setPinSuccess(false);
    }, 1500);
  };

  const handleResetPINConfirm = () => {
    if (!user) return;

    const newPin = resetPIN(user.id);
    setResetPINValue(newPin);
    setShowResetPINConfirm(false);
    setShowResetPINDisplay(true);

    setTimeout(() => {
      setShowResetPINDisplay(false);
      setResetPINValue(null);
    }, 5000);
  };

  const handleClosePINDialog = () => {
    if (!pinSuccess) {
      setShowChangePINDialog(false);
      setNewPin("");
      setConfirmPin("");
      setPinError(null);
    }
  };

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

      <SectionCard title={t("Security", "নিরাপত্তা")}>
        <p className="mb-3 text-[11px] text-muted-foreground">
          {t("Manage the user's 4-digit PIN", "ইউজারের ৪-সংখ্যার পিন পরিচালনা করুন")}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowChangePINDialog(true)}
            className="tap flex-1 rounded-2xl bg-muted py-3 text-sm font-bold"
          >
            {t("Change PIN", "পিন পরিবর্তন")}
          </button>
          <button
            onClick={() => setShowResetPINConfirm(true)}
            className="tap flex-1 rounded-2xl bg-muted py-3 text-sm font-bold"
          >
            {t("Reset PIN", "পিন পুনরায় সেট")}
          </button>
        </div>
      </SectionCard>

      {/* Change PIN Dialog */}
      {showChangePINDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-sm rounded-t-3xl bg-card p-6 sm:rounded-2xl">
            <h2 className="mb-4 text-lg font-bold">{t("Change PIN", "পিন পরিবর্তন")}</h2>

            {pinSuccess ? (
              <div className="mb-4 rounded-2xl bg-success/12 p-3 text-center text-sm font-bold text-success">
                {t("PIN changed successfully!", "পিন সফলভাবে পরিবর্তিত হয়েছে!")}
              </div>
            ) : (
              <>
                <div className="mb-3 space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">
                    {t("New PIN", "নতুন পিন")}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setNewPin(val);
                      setPinError(null);
                    }}
                    placeholder="••••"
                    className="w-full rounded-2xl border border-border bg-muted px-4 py-2.5 text-center text-sm font-bold tracking-widest outline-none"
                  />
                </div>

                <div className="mb-3 space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">
                    {t("Confirm PIN", "পিন নিশ্চিত করুন")}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setConfirmPin(val);
                      setPinError(null);
                    }}
                    placeholder="••••"
                    className="w-full rounded-2xl border border-border bg-muted px-4 py-2.5 text-center text-sm font-bold tracking-widest outline-none"
                  />
                </div>

                {pinError && (
                  <div className="mb-3 rounded-2xl bg-destructive/12 p-3 text-center text-xs font-bold text-destructive">
                    {pinError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleClosePINDialog}
                    className="tap flex-1 rounded-2xl border border-border py-3 text-sm font-bold"
                  >
                    {t("Cancel", "বাতিল")}
                  </button>
                  <button
                    onClick={handleChangePINSubmit}
                    className="tap flex-1 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
                  >
                    {t("Save", "সংরক্ষণ")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reset PIN Confirmation */}
      {showResetPINConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-sm rounded-t-3xl bg-card p-6 sm:rounded-2xl">
            <h2 className="mb-3 text-lg font-bold">{t("Reset PIN?", "পিন পুনরায় সেট করবেন?")}</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {t(
                "This will generate a new random 4-digit PIN. Make sure to give it to the user.",
                "এটি একটি নতুন র‍্যান্ডম ৪-সংখ্যার পিন তৈরি করবে। ইউজারকে এটি দিতে নিশ্চিত করুন।",
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetPINConfirm(false)}
                className="tap flex-1 rounded-2xl border border-border py-3 text-sm font-bold"
              >
                {t("Cancel", "বাতিল")}
              </button>
              <button
                onClick={handleResetPINConfirm}
                className="tap flex-1 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
              >
                {t("Reset", "পুনরায় সেট")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset PIN Display */}
      {showResetPINDisplay && resetPINValue && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-sm rounded-t-3xl bg-card p-6 sm:rounded-2xl">
            <h2 className="mb-4 text-lg font-bold">{t("New PIN Generated", "নতুন পিন তৈরি হয়েছে")}</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {t(
                "Share this PIN with the user. It will disappear in a few seconds.",
                "এই পিনটি ইউজারের সাথে শেয়ার করুন। এটি কয়েক সেকেন্ডে অদৃশ্য হয়ে যাবে।",
              )}
            </p>
            <div className="mb-4 rounded-2xl bg-success/12 p-4 text-center">
              <p className="text-xs text-muted-foreground">{t("New PIN", "নতুন পিন")}</p>
              <p className="mt-2 text-4xl font-extrabold tracking-widest text-success">{resetPINValue}</p>
            </div>
            <button
              onClick={() => setShowResetPINDisplay(false)}
              className="tap w-full rounded-2xl bg-muted py-3 text-sm font-bold"
            >
              {t("OK", "ঠিক আছে")}
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}