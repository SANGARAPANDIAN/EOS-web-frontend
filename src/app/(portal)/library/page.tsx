"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LibraryIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/library/dashboard");
  }, [router]);

  return null;
}
