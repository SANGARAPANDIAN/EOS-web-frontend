"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StationaryIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/stationary/dashboard");
  }, [router]);

  return null;
}
