"use client";

export type ProfileUser = {
  id?: number;
  name: string;
  email?: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const PROFILE_CHANGE_EVENT = "pos-profile-change";
const PROFILE_IMAGE_PREFIX = "pos_profile_image";
const PROFILE_VERSION_KEY = "pos_profile_updated_at";

export function parseProfileUserSnapshot(snapshot: string | null): ProfileUser {
  if (!snapshot) return { id: 1, name: "Admin", email: "cheychon258@gmail.com", role: "Admin" };

  try {
    const user = JSON.parse(snapshot) as {
      id?: number;
      name?: string;
      email?: string;
      role?: string | { name?: string };
      isActive?: boolean;
      createdAt?: string;
      updatedAt?: string;
    };

    const roleName = typeof user.role === "string" ? user.role : user.role?.name || "Admin";

    return {
      id: user.id || (roleName.toLowerCase().includes("admin") || user.email === "cheychon258@gmail.com" ? 1 : undefined),
      name: user.name || "Admin",
      email: user.email || "cheychon258@gmail.com",
      role: roleName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch {
    return { id: 1, name: "Admin", email: "cheychon258@gmail.com", role: "Admin" };
  }
}

export function profileImageKey(user: ProfileUser) {
  return `${PROFILE_IMAGE_PREFIX}_${user.id || user.email || user.name || "guest"}`;
}

export function getProfileImage(user: ProfileUser) {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(profileImageKey(user)) || "";
}

export function saveProfileImage(user: ProfileUser, image: string) {
  localStorage.setItem(profileImageKey(user), image);
  localStorage.setItem(PROFILE_VERSION_KEY, String(Date.now()));
  window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
}

export function clearProfileImage(user: ProfileUser) {
  localStorage.removeItem(profileImageKey(user));
  localStorage.setItem(PROFILE_VERSION_KEY, String(Date.now()));
  window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
}

export function getProfileVersionSnapshot() {
  return localStorage.getItem(PROFILE_VERSION_KEY) || "";
}

export function getServerProfileVersionSnapshot() {
  return "";
}

export function subscribeToProfileChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(PROFILE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(PROFILE_CHANGE_EVENT, onStoreChange);
  };
}

export function initials(name: string) {
  const value = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return value || "U";
}

export function profileAvatarClass(role: string) {
  if (role === "Cashier") return "bg-blue-600";
  if (role === "Admin" || role === "Super Admin") return "bg-emerald-600";
  if (role === "Staff") return "bg-amber-600";
  return "bg-slate-600";
}

export function profileRoleClass(role: string) {
  if (role === "Cashier") return "bg-blue-50 text-blue-700";
  if (role === "Admin" || role === "Super Admin") return "bg-emerald-50 text-emerald-700";
  if (role === "Staff") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}
