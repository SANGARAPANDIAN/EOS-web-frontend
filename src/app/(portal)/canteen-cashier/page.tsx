"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CanteenCashierIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/canteen-cashier/billing");
  }, [router]);

  return null;
}
