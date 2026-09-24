"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StationeryStoreIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/stationery-store/dashboard");
  }, [router]);

  return null;
}
