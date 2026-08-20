"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TransportIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/transport/dashboard");
  }, [router]);

  return null;
}
