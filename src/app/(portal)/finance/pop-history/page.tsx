"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// History moved into the POP page's own Tracking / History switch. This
// route is kept so any existing link or bookmark still lands in the right place.
export default function PopHistoryRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/finance/pop-tracking?view=history");
  }, [router]);
  return null;
}
