"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HostelWardenIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hostel-warden/dashboard");
  }, [router]);

  return null;
}
