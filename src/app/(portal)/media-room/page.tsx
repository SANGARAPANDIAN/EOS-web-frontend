"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MediaRoomIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/media-room/dashboard");
  }, [router]);

  return null;
}
