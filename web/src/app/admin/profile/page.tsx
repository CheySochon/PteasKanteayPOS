"use client";

import { ChangeEvent, useMemo, useState, useSyncExternalStore } from "react";
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
import {
  clearProfileImage,
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
  const user = parseProfileUserSnapshot(
    useSyncExternalStore(subscribeToUserChanges, getUserSnapshot, getServerUserSnapshot)
  );
  useSyncExternalStore(
    subscribeToProfileChanges,
    getProfileVersionSnapshot,
    getServerProfileVersionSnapshot
  );

  const dark = theme === "dark";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const softSurface = dark ? "bg-[#232333]" : "bg-[#f5f5f9]";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-[#e5e7eb]";
  const textPrimary = dark ? "text-slate-100" : "text-[#566a7f]";
  const textSecondary = dark ? "text-slate-400" : "text-[#a1acb8]";
  const image = getProfileImage(user);
  const previewImage = removeImage ? "" : pendingImage || image;
  const hasChanges = Boolean(pendingImage || removeImage);

  const details = useMemo(
    () => [
      { label: "Name", value: user.name, Icon: UserRound, colorClass: "text-[#696cff] bg-[#696cff]/10" },
      { label: "Email", value: user.email || "No email saved", Icon: Mail, colorClass: "text-[#03c3ec] bg-[#03c3ec]/10" },
      { label: "Role", value: user.role, Icon: ShieldCheck, colorClass: "text-[#71dd37] bg-[#71dd37]/10" },
      { label: "Status", value: user.isActive === false ? "Inactive" : "Active", Icon: CheckCircle2, colorClass: "text-[#ffab00] bg-[#ffab00]/10" },
      { label: "User ID", value: user.id ? String(user.id) : "Local user", Icon: IdCard, colorClass: "text-[#8592a3] bg-[#8592a3]/10" },
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
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("Unable to read image.");
        return;
      }

      setPendingImage(reader.result);
      setRemoveImage(false);
      setMessage("Image ready. Click Save Changes to apply.");
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
        
        {/* Sneat Profile Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#696cff]">
              <UserRound size={14} />
              Staff Profile
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${textPrimary}`}>
              Profile Account
            </h1>
            <p className={`mt-0.5 text-xs text-[#a1acb8] font-medium`}>
              Manage your staff profile avatar and review your credentials.
            </p>
          </div>

          <button
            type="button"
            onClick={saveChanges}
            disabled={!hasChanges}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded bg-[#696cff] px-5 text-sm font-semibold text-white shadow-sm shadow-[#696cff]/20 hover:bg-[#5f61e6] disabled:cursor-not-allowed disabled:opacity-50 transition-all active:scale-95"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>

        {/* Error and Success Alerts */}
        {error && (
          <div className="mb-5 rounded border border-red-150 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded border border-emerald-150 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700">
            {message}
          </div>
        )}

        {/* Profile details grid */}
        <section className="grid gap-6 md:grid-cols-[320px_1fr] animate-[profilePageIn_560ms_ease-out]">
          {/* Avatar / Photo Panel */}
          <div className={`rounded border shadow-sm p-6 ${surface} ${borderCol} flex flex-col items-center justify-center text-center`}>
            <div className="relative group">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt={user.name}
                  className="h-32 w-32 rounded-full object-cover border-4 border-slate-100 shadow-md transition-all group-hover:brightness-95"
                />
              ) : (
                <div
                  className={`flex h-32 w-32 items-center justify-center rounded-full text-3xl font-black text-white shadow-md border-4 border-slate-100 ${profileAvatarClass(
                    user.role,
                  )}`}
                >
                  {initials(user.name)}
                </div>
              )}

              <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#696cff] text-white shadow shadow-[#696cff]/30">
                <Camera size={16} />
              </span>
            </div>

            <h2 className={`mt-5 text-lg font-bold ${textPrimary}`}>
              {user.name}
            </h2>
            
            <div className="mt-2.5 flex items-center gap-1.5 rounded-md px-3 py-1 bg-[#696cff]/10 text-[#696cff]">
              <RoleIcon role={user.role} />
              <span className="text-xs font-semibold capitalize">{user.role}</span>
            </div>

            <div className="mt-6 flex w-full gap-3">
              <label className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded bg-[#696cff] px-4 text-xs font-semibold text-white hover:bg-[#5f61e6] active:scale-95 transition-all">
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
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 transition-all active:scale-95"
                title="Remove photo"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Account Details Panel */}
          <div className={`rounded border shadow-sm p-6 ${surface} ${borderCol}`}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className={`text-base font-bold ${textPrimary}`}>
                  Account Details
                </h2>
                <p className={`mt-0.5 text-xs text-[#a1acb8] font-medium`}>
                  Overview of your credential and system attributes.
                </p>
              </div>
              <span className={`rounded px-2.5 py-1 text-xs font-semibold bg-[#eceef1]/60 text-[#8592a3] border ${borderCol}`}>
                POS Account
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {details.map(({ label, value, Icon, colorClass }) => (
                <div
                  key={label}
                  className={`flex items-center gap-3.5 rounded border p-4 ${borderCol} bg-[#fcfcfd] ${dark ? "bg-[#232333]/40" : ""}`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded ${colorClass}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {label}
                    </div>
                    <div className={`mt-0.5 truncate text-sm font-semibold ${textPrimary}`}>
                      {value}
                    </div>
                  </div>
                </div>
              ))}
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
