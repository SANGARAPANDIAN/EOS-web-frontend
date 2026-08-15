"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MedicalCentreIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/medical-centre/dashboard");
  }, [router]);

  return null;
}
