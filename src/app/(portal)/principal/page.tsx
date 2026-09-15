"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PrincipalIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/principal/dashboard");
  }, [router]);

  return null;
}
