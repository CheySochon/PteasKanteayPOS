"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KdsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/kitchen");
  }, [router]);

  return null;
}
