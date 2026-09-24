"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CanteenAdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/canteen-admin/dashboard");
  }, [router]);

  return null;
}
