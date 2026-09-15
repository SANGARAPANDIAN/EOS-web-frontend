"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BillingIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/billing/dashboard");
  }, [router]);

  return null;
}
