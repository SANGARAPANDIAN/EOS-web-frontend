"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { parentModuleConfig } from "@/modules/parent/nav";
import { useMyIdentity } from "@/modules/student/api/profile";
import { ChildProvider, useSelectedChild } from "@/modules/parent/ChildContext";
import { useChildHostelRoom } from "@/modules/parent/api/hostel";
import { useChildCareerPath } from "@/modules/parent/api/careerPath";

function ParentShellInner({ children }: { children: React.ReactNode }) {
  const identity = useMyIdentity();
  const { selectedChild, selectedChildId } = useSelectedChild();
  const hostelRoom = useChildHostelRoom(selectedChildId);
  const careerPath = useChildCareerPath(selectedChildId);

  // Same "held back until loaded" reasoning as StudentShell's own
  // isHosteller/declaredPath gating — held back until the child's own data
  // has actually arrived, so a nav item never flashes visible then
  // disappears once the real value loads.
  const isHosteller = hostelRoom.data?.is_hostel_resident ?? false;
  const declaredPath = careerPath.data?.career_path ?? null;
  const careerPathLoaded = !careerPath.isLoading;

  const moduleConfig = useMemo(
    () => ({
      ...parentModuleConfig,
      navGroups: parentModuleConfig.navGroups.map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            (!item.hostellerOnly || isHosteller) &&
            (!item.careerPath || (careerPathLoaded && (!declaredPath || item.careerPath === declaredPath))),
        ),
      })),
    }),
    [isHosteller, declaredPath, careerPathLoaded],
  );

  return (
    <AppShell
      moduleConfig={moduleConfig}
      header={{
        studentName: identity.data?.name,
        searchPlaceholder: "Search…",
        roleDeptLabel: `Parent${selectedChild ? ` · ${selectedChild.name}` : ""}`,
        showNotifications: false,
      }}
    >
      {children}
    </AppShell>
  );
}

export function ParentShell({ children }: { children: React.ReactNode }) {
  return (
    <ChildProvider>
      <ParentShellInner>{children}</ParentShellInner>
    </ChildProvider>
  );
}
