"use client";

import { ChangeEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Camera,
  CheckCircle2,
  IdCard,
  Mail,
  Save,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserRound,
  Crown,
  CreditCard,
  ChefHat,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useAppTheme } from "../../../lib/theme";
import AnimatedToast from "../../../components/AnimatedToast";
import { getMe, updateUser } from "../../../lib/api";
import {
  clearProfileImage,
  compressImageBase64,
  getProfileImage,
  getProfileVersionSnapshot,
  getServerProfileVersionSnapshot,
  initials,
  parseProfileUserSnapshot,
  profileAvatarClass,
  profileRoleClass,
  saveProfileImage,
  subscribeToProfileChanges,
} from "../../../lib/profile";
import { useAutoDismiss } from "../../../lib/useAutoDismiss";

function getUserSnapshot() {
  return localStorage.getItem("pos_user") || JSON.stringify({ name: "Guest", role: "Member" });
}

function getServerUserSnapshot() {
  return JSON.stringify({ name: "User", role: "Member" });
}

function subscribeToUserChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("pos-auth-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("pos-auth-change", onStoreChange);
  };
}

export default function ProfilePage() {
  const [theme] = useAppTheme();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useAutoDismiss(message, setMessage);
  useAutoDismiss(error, setError);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [apiUser, setApiUser] = useState<any>(null);

  // Password & Security States
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    getMe()
      .then((meUser: any) => {
        if (meUser) {
          setApiUser(meUser);
          const storedRaw = localStorage.getItem("pos_user");
          let stored: any = {};
          try { if (storedRaw) stored = JSON.parse(storedRaw); } catch {}
          const updated = {
            ...stored,
            ...meUser,
            id: meUser.id,
            name: meUser.name,
            email: meUser.email,
            role: typeof meUser.role === "string" ? meUser.role : meUser.role?.name || "Admin",
          };
          localStorage.setItem("pos_user", JSON.stringify(updated));
          window.dispatchEvent(new Event("pos-auth-change"));
        }
      })
      .catch(() => {});
  }, []);

  const localUser = parseProfileUserSnapshot(
    useSyncExternalStore(subscribeToUserChanges, getUserSnapshot, getServerUserSnapshot)
  );
  useSyncExternalStore(
    subscribeToProfileChanges,
    getProfileVersionSnapshot,
    getServerProfileVersionSnapshot
  );

  const user = useMemo(() => {
    if (apiUser) {
      return {
        id: apiUser.id,
        name: apiUser.name || localUser.name,
        email: apiUser.email || localUser.email,
        role: typeof apiUser.role === "string" ? apiUser.role : apiUser.role?.name || localUser.role,
        isActive: apiUser.isActive !== undefined ? apiUser.isActive : localUser.isActive,
        createdAt: apiUser.createdAt,
        updatedAt: apiUser.updatedAt,
      };
    }
    return localUser;
  }, [apiUser, localUser]);

  const dark = theme === "dark";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const softSurface = dark ? "bg-[#232333]" : "bg-white";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200/80";
  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";
  const textSecondary = dark ? "text-slate-400" : "text-[#64748b]";
  const image = getProfileImage(user);
  const previewImage = removeImage ? "" : pendingImage || image;
  const hasChanges = Boolean(pendingImage || removeImage);

  const details = useMemo(
    () => [
      { label: "Name", value: user.name, Icon: UserRound, colorClass: "text-[#696cff] bg-[#696cff]/10" },
      { label: "Email", value: user.email || "No email saved", Icon: Mail, colorClass: "text-[#03c3ec] bg-[#03c3ec]/10" },
      { label: "Role", value: user.role, Icon: ShieldCheck, colorClass: "text-[#71dd37] bg-[#71dd37]/10" },
      { label: "Status", value: user.isActive === false ? "Inactive" : "Active", Icon: CheckCircle2, colorClass: "text-[#ffab00] bg-[#ffab00]/10" },
      { label: "User ID", value: user.id ? `#${user.id}` : "#1", Icon: IdCard, colorClass: "text-[#8592a3] bg-[#8592a3]/10" },
    ],
    [user.email, user.id, user.isActive, user.name, user.role]
  );

  function uploadProfileImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setMessage("");
    setError("");

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== "string") {
        setError("Unable to read image.");
        return;
      }

      try {
        const compressed = await compressImageBase64(reader.result, 256, 0.75);
        setPendingImage(compressed);
        setRemoveImage(false);
        setMessage("Image ready. Click Save Changes to apply.");
      } catch {
        setPendingImage(reader.result);
        setRemoveImage(false);
        setMessage("Image ready. Click Save Changes to apply.");
      }
    };
    reader.onerror = () => setError("Unable to read image.");
    reader.readAsDataURL(file);
  }

  function removeProfileImage() {
    setPendingImage(null);
    setRemoveImage(true);
    setMessage("Image removal ready. Click Save Changes to apply.");
    setError("");
  }

  function saveChanges() {
    if (removeImage) {
      clearProfileImage(user);
    } else if (pendingImage) {
      saveProfileImage(user, pendingImage);
    }

    setPendingImage(null);
    setRemoveImage(false);
    setError("");
  }

  async function handleSaveSecurityAndProfile() {
    if (!user?.id) {
      setError("Unable to identify logged-in user.");
      return;
    }

    if (newPassword && newPassword.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (pinInput && !/^\d{4}$/.test(pinInput)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }

    setSavingProfile(true);
    setMessage("");
    setError("");

    try {
      const payload: any = {};
      if (newPassword) payload.password = newPassword;
      if (pinInput) payload.pin = pinInput;

      if (Object.keys(payload).length > 0) {
        const updated = await updateUser(user.id, payload);
        if (updated) setApiUser(updated);
      }

      if (hasChanges) {
        saveChanges();
      } else if (Object.keys(payload).length === 0) {
        setError("No changes to save.");
        setSavingProfile(false);
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setPinInput("");
      setMessage("Profile & Password updated successfully!");
    } catch (err: any) {
      setError(err?.message || "Failed to update password.");
    } finally {
      setSavingProfile(false);
    }
  }

  const canSave = hasChanges || Boolean(newPassword && newPassword === confirmPassword && newPassword.length >= 4) || Boolean(pinInput && /^\d{4}$/.test(pinInput));

  return (
    <main className={`flex-1 overflow-y-auto ${softSurface}`}>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6 animate-[profilePageIn_520ms_ease-out]">
        
        {/* Profile Header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-medium tracking-normal ${textPrimary}`}>
            Profile Account
          </h1>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
            <AnimatedToast key={error} message={error} onClose={() => setError("")} type="error" />
          </div>
        )}
        {message && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
            <AnimatedToast key={message} message={message} onClose={() => setMessage("")} type="success" />
          </div>
        )}

        {/* Profile Details & Image Grid */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Avatar Panel */}
          <div className={`rounded-2xl border p-6 ${surface} ${borderCol} flex flex-col items-center text-center justify-between`}>
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className={`h-28 w-28 overflow-hidden rounded-full border-2 border-dashed ${borderCol} p-1`}>
                  {previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImage}
                      alt={user.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className={profileAvatarClass(user.name)}>
                      {initials(user.name)}
                    </div>
                  )}
                </div>
              </div>

              <h2 className={`mt-4 text-lg font-semibold ${textPrimary}`}>
                {user.name}
              </h2>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <RoleIcon role={user.role} />
                <span className={profileRoleClass(user.role)}>
                  {user.role}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-[#55a060] px-4 text-xs font-semibold text-white hover:bg-[#488c52] transition active:scale-95 duration-200">
                <UploadCloud size={15} />
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadProfileImage}
                />
              </label>

              <button
                type="button"
                onClick={removeProfileImage}
                disabled={!previewImage}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-all active:scale-95 duration-200"
                title="Remove photo"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Account Details & Security Panel */}
          <div className={`rounded-2xl border shadow-none p-6 ${surface} ${borderCol} flex flex-col justify-between`}>
            <div className="space-y-6">
              <div>
                <h2 className={`text-base font-medium mb-4 ${textPrimary}`}>
                  Account Details
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {details.map(({ label, value, Icon, colorClass }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-3 rounded-xl border p-3 ${borderCol} bg-[#fcfcfd] ${dark ? "bg-[#232333]/40" : ""}`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {label}
                        </div>
                        <div className={`mt-0.5 truncate text-xs font-semibold ${textPrimary}`}>
                          {value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Password & Security Section */}
              <div className={`pt-5 border-t ${dark ? "border-slate-800" : "border-slate-100"}`}>
                <div className="flex items-center gap-2 mb-3.5">
                  <KeyRound size={16} className="text-[#55a060]" />
                  <h3 className={`text-sm font-bold ${textPrimary}`}>
                    Change Password &amp; Security PIN
                  </h3>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 4 chars)"
                        className={`w-full rounded-xl border px-3 py-2 pr-9 text-xs outline-none transition ${
                          dark ? "border-[#3b3c54] bg-[#232333] text-white" : "border-slate-300 bg-white text-slate-800"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className={`w-full rounded-xl border px-3 py-2 text-xs outline-none transition ${
                        dark ? "border-[#3b3c54] bg-[#232333] text-white" : "border-slate-300 bg-white text-slate-800"
                      }`}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      4-Digit POS Security PIN (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 1234"
                      className={`w-full rounded-xl border px-3 py-2 text-xs font-mono tracking-widest outline-none transition ${
                        dark ? "border-[#3b3c54] bg-[#232333] text-white" : "border-slate-300 bg-white text-slate-800"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Save Changes Button */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSecurityAndProfile}
                disabled={!canSave || savingProfile}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#55a060] px-6 text-sm font-semibold text-white shadow-sm shadow-[#55a060]/20 hover:bg-[#488c52] hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all active:scale-95 duration-200 cursor-pointer"
              >
                {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes profilePageIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

function RoleIcon({ role }: { role: string }) {
  if (role === "Super Admin" || role === "Admin") {
    return <Crown size={14} className="text-[#696cff] shrink-0" />;
  }
  if (role === "Cashier") {
    return <CreditCard size={14} className="text-[#03c3ec] shrink-0" />;
  }
  if (role === "Staff") {
    return <ChefHat size={14} className="text-[#ffab00] shrink-0" />;
  }
  return <UserRound size={14} className="text-[#8592a3] shrink-0" />;
}
