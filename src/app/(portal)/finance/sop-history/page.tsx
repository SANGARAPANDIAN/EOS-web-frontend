"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// History moved into the SOP page's own Tracking / History switch. This
// route is kept so any existing link or bookmark still lands in the right place.
export default function SopHistoryRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/finance/sop-tracking?view=history");
  }, [router]);
  return null;
}
