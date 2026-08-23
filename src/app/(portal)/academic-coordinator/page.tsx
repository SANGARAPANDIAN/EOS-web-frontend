"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AcademicCoordinatorIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/academic-coordinator/dashboard");
  }, [router]);

  return null;
}
