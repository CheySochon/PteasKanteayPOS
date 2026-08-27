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
} from "lucide-react";
import { useAppTheme } from "../../../lib/theme";
import { getMe } from "../../../lib/api";
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
      setMessage("Profile image removed.");
    } else if (pendingImage) {
      saveProfileImage(user, pendingImage);
      setMessage("Profile image updated.");
    }

    setPendingImage(null);
    setRemoveImage(false);
    setError("");
  }

  return (
    <main className={`flex-1 overflow-y-auto ${softSurface}`}>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6 animate-[profilePageIn_520ms_ease-out]">
        
        {/* Profile Header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-medium tracking-normal ${textPrimary}`}>
            Profile Account
          </h1>
        </div>

        {/* Error and Success Alerts */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-150 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-600">
            {error}
          </div>
        )}



        {/* Profile details grid */}
        <section className="grid gap-6 md:grid-cols-[320px_1fr] animate-[profilePageIn_560ms_ease-out]">
          {/* Avatar / Photo Panel */}
          <div className={`rounded-2xl border shadow-none p-6 ${surface} ${borderCol} flex flex-col items-center justify-center text-center`}>
            {/* Clickable Avatar Photo Container with Camera Icon */}
            <label className="relative group cursor-pointer block" title="Click to upload profile photo">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt={user.name}
                  className="h-32 w-32 rounded-full object-cover border-4 border-slate-100 dark:border-slate-800 shadow-md transition-all duration-200 group-hover:brightness-90 group-hover:scale-105"
                />
              ) : (
                <div
                  className={`flex h-32 w-32 items-center justify-center rounded-full text-3xl font-black text-white shadow-md border-4 border-slate-100 dark:border-slate-800 transition-all duration-200 group-hover:scale-105 ${profileAvatarClass(
                    user.role,
                  )}`}
                >
                  {initials(user.name)}
                </div>
              )}

              <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#55a060] text-white shadow-md shadow-[#55a060]/30 transition-transform duration-200 group-hover:scale-110 group-hover:bg-[#488c52]">
                <Camera size={16} />
              </span>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={uploadProfileImage}
              />
            </label>

            <h2 className={`mt-5 text-base font-semibold ${textPrimary}`}>
              {user.name}
            </h2>
            
            <div className="mt-2.5 flex items-center gap-1.5 rounded-md px-3 py-1 bg-[#55a060]/10 text-[#55a060]">
              <RoleIcon role={user.role} />
              <span className="text-xs font-medium capitalize">{user.role}</span>
            </div>

            <div className="mt-6 flex w-full gap-3">
              <label className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#55a060] px-4 text-xs font-medium text-white hover:bg-[#488c52] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200">
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
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all active:scale-95 duration-200"
                title="Remove photo"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Account Details Panel */}
          <div className={`rounded-2xl border shadow-none p-6 ${surface} ${borderCol} flex flex-col justify-between`}>
            <div>
              <div className="mb-5">
                <h2 className={`text-base font-medium ${textPrimary}`}>
                  Account Details
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {details.map(({ label, value, Icon, colorClass }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-3.5 rounded-xl border p-4 ${borderCol} bg-[#fcfcfd] ${dark ? "bg-[#232333]/40" : ""} ${
                      label === "User ID" ? "sm:col-span-2" : ""
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {label}
                      </div>
                      <div className={`mt-0.5 truncate text-sm font-medium ${textPrimary}`}>
                        {value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Save Changes Button (Matching Settings Page) */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={saveChanges}
                disabled={!hasChanges}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#55a060] px-6 text-sm font-semibold text-white shadow-sm shadow-[#55a060]/20 hover:bg-[#488c52] hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all active:scale-95 duration-200 cursor-pointer"
              >
                <Save size={16} />
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
