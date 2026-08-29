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
  if (!snapshot) return { id: 1, name: "Super Admin", email: "cheychon258@gmail.com", role: "Super Admin" };

  try {
    const user = JSON.parse(snapshot) as any;

    const rawRole = typeof user.role === "string" ? user.role : user.role?.name || user.roleName || "";
    const isSuperAdmin = user.id === 1 || String(rawRole).toLowerCase().includes("super") || user.email === "cheychon258@gmail.com";
    const resolvedRole = isSuperAdmin ? "Super Admin" : (rawRole || "Admin");

    return {
      id: user.id || 1,
      name: user.name || "Super Admin",
      email: user.email || "cheychon258@gmail.com",
      role: resolvedRole,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch {
    return { id: 1, name: "Super Admin", email: "cheychon258@gmail.com", role: "Super Admin" };
  }
}

const memoryImageStore = new Map<string, string>();

export function profileImageKey(user: ProfileUser) {
  return `${PROFILE_IMAGE_PREFIX}_${user.id || user.email || user.name || "guest"}`;
}

export function getProfileImage(user: ProfileUser) {
  if (typeof window === "undefined") return "";
  const key = profileImageKey(user);
  return memoryImageStore.get(key) || localStorage.getItem(key) || "";
}

/**
 * Compress Base64 Data URL image using Canvas to fit within localStorage quota (<50KB)
 */
export function compressImageBase64(dataUrl: string, maxDim = 256, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith("data:image")) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function saveProfileImage(user: ProfileUser, image: string) {
  if (typeof window === "undefined") return;
  const key = profileImageKey(user);
  memoryImageStore.set(key, image);

  const attemptSave = (imgStr: string) => {
    try {
      localStorage.setItem(key, imgStr);
      localStorage.setItem(PROFILE_VERSION_KEY, String(Date.now()));
      window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
      return true;
    } catch (err) {
      // Clear old profile images from localStorage to free space
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith(PROFILE_IMAGE_PREFIX) && k !== key) {
            localStorage.removeItem(k);
          }
        }
        localStorage.setItem(key, imgStr);
        localStorage.setItem(PROFILE_VERSION_KEY, String(Date.now()));
        window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
        return true;
      } catch (innerErr) {
        // Fallback to memory store without crashing with QuotaExceededError
        window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
        return false;
      }
    }
  };

  if (!attemptSave(image) && image.startsWith("data:image")) {
    compressImageBase64(image, 256, 0.75).then((compressed) => {
      memoryImageStore.set(key, compressed);
      attemptSave(compressed);
    });
  }
}

export function clearProfileImage(user: ProfileUser) {
  if (typeof window === "undefined") return;
  const key = profileImageKey(user);
  memoryImageStore.delete(key);
  try {
    localStorage.removeItem(key);
    localStorage.setItem(PROFILE_VERSION_KEY, String(Date.now()));
  } catch {}
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
