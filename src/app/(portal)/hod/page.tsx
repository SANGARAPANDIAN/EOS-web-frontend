"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HodIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hod/dashboard");
  }, [router]);

  return null;
}
