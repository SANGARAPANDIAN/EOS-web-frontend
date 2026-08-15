"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HigherEducationIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/higher-education/dashboard");
  }, [router]);

  return null;
}
