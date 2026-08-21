"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GateWardenIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/gate-warden/dashboard");
  }, [router]);

  return null;
}
