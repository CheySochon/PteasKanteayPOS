"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiOrigin, getSettings, login } from "../../lib/api";
import { useAutoDismiss } from "../../lib/useAutoDismiss";

const DEFAULT_POS_NAME = "The Tofu";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [posName, setPosName] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_POS_NAME;
    return localStorage.getItem("pos_restaurant_name") || DEFAULT_POS_NAME;
  });
  const [restaurantImageUrl, setRestaurantImageUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("pos_restaurant_image_url") || "";
  });
  const [error, setError] = useState("");
  useAutoDismiss(error, setError);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    getSettings()
      .then((settings) => {
        const nextName = settings.restaurantName || DEFAULT_POS_NAME;
        setPosName(nextName);
        setRestaurantImageUrl(settings.restaurantImageUrl || "");
        localStorage.setItem("pos_restaurant_name", nextName);
        localStorage.setItem("pos_restaurant_image_url", settings.restaurantImageUrl || "");
        window.dispatchEvent(new Event("pos-settings-change"));
      })
      .catch(() => undefined);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login(email, password);
      localStorage.setItem("pos_token", result.token);
      localStorage.setItem("pos_user", JSON.stringify(result.user));
      window.dispatchEvent(new Event("pos-auth-change"));
      router.replace(getRedirectPath());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-[#1D9E75] text-lg font-black text-white shadow-sm shadow-emerald-700/20">
            {restaurantImageUrl ? (
              <Image
                src={resolveImageUrl(restaurantImageUrl)}
                alt={posName}
                width={56}
                height={56}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              initials(posName)
            )}
          </div>

          <p className="font-khmer mx-auto max-w-[320px] truncate text-lg font-black leading-7 tracking-normal text-[#1D9E75]">
            {posName}
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Sign in
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Access your admin dashboard
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {error && (
            <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#1D9E75] focus:ring-3 focus:ring-[#1D9E75]/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#1D9E75] focus:ring-3 focus:ring-[#1D9E75]/10"
              />
            </div>
          </div>

          <button
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-[#1D9E75] py-3 text-sm font-semibold text-white hover:bg-[#188a66] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <Link
            href="/"
            className="mt-5 block text-center text-sm font-medium text-slate-500 hover:text-[#1D9E75]"
          >
            Back to home
          </Link>
        </form>
      </div>
    </main>
  );
}

function getRedirectPath() {
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  return redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/admin";
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "P"
  );
}

function resolveImageUrl(imageUrl: string) {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${apiOrigin}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}
