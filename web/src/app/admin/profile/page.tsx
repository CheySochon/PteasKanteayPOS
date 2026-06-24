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
  const surface = dark ? "bg-[#111827]" : "bg-white";
  const softSurface = dark ? "bg-[#0f172a]" : "bg-slate-50";
  const borderCol = dark ? "border-slate-700/70" : "border-slate-200";
  const textPrimary = dark ? "text-slate-100" : "text-slate-950";
  const textSecondary = dark ? "text-slate-400" : "text-slate-500";
  const image = getProfileImage(user);
  const previewImage = removeImage ? "" : pendingImage || image;
  const hasChanges = Boolean(pendingImage || removeImage);

  const details = useMemo(
    () => [
      { label: "Name", value: user.name, Icon: UserRound },
      { label: "Email", value: user.email || "No email saved", Icon: Mail },
      { label: "Role", value: user.role, Icon: ShieldCheck },
      { label: "Status", value: user.isActive === false ? "Inactive" : "Active", Icon: CheckCircle2 },
      { label: "User ID", value: user.id ? String(user.id) : "Local user", Icon: IdCard },
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
    <main className="flex-1 overflow-y-auto px-5 py-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#1D9E75]/10 px-3 py-1 text-xs font-bold text-[#1D9E75]">
                <UserRound size={14} />
                Staff Profile
              </div>
              <h1 className={`text-3xl font-black tracking-tight ${textPrimary}`}>
                Profile
              </h1>
              <p className={`mt-1 text-sm ${textSecondary}`}>
                Manage the staff image and review account details.
              </p>
            </div>

            <button
              type="button"
              onClick={saveChanges}
              disabled={!hasChanges}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1D9E75] px-5 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-[#188a66] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={17} />
              Save Changes
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

          <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
            <div className={`rounded-xl border p-5 shadow-sm ${surface} ${borderCol}`}>
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={user.name}
                      className="h-36 w-36 rounded-2xl object-cover shadow-sm ring-1 ring-slate-200"
                    />
                  ) : (
                    <div
                      className={`flex h-36 w-36 items-center justify-center rounded-2xl text-4xl font-black text-white shadow-sm ${profileAvatarClass(
                        user.role,
                      )}`}
                    >
                      {initials(user.name)}
                    </div>
                  )}

                  <span className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#1D9E75] text-white shadow-lg shadow-emerald-700/20">
                    <Camera size={18} />
                  </span>
                </div>

                <h2 className={`mt-5 text-xl font-black ${textPrimary}`}>
                  {user.name}
                </h2>
                <div className={`mt-2 rounded-full px-3 py-1 text-xs font-black ${profileRoleClass(user.role)}`}>
                  {user.role}
                </div>

                <div className="mt-5 flex w-full gap-2">
                  <label className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#1D9E75] px-4 text-sm font-bold text-white hover:bg-[#188a66]">
                    <UploadCloud size={17} />
                    Upload
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
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Remove image"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            </div>

            <div className={`rounded-xl border p-5 shadow-sm ${surface} ${borderCol}`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className={`text-lg font-black ${textPrimary}`}>
                    Account Details
                  </h2>
                  <p className={`mt-1 text-sm ${textSecondary}`}>
                    Details are loaded from the signed-in staff account.
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${softSurface} ${textSecondary}`}>
                  POS Staff
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {details.map(({ label, value, Icon }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${borderCol} ${softSurface}`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1D9E75]/10 text-[#1D9E75]">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-[10px] font-black uppercase tracking-wide ${textSecondary}`}>
                        {label}
                      </div>
                      <div className={`mt-0.5 truncate text-sm font-bold ${textPrimary}`}>
                        {value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
    </main>
  );
}
