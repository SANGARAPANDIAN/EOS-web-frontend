"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SportsAdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sports-admin/dashboard");
  }, [router]);

  return null;
}
