"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/auth/AuthContext";

export interface SwitchViewAction {
  /** Shown as the button's tooltip/title, e.g. "Switch to Faculty view". */
  label: string;
  /** Material Symbols icon name. */
  icon: string;
  onClick: () => void;
}

interface SidebarUserFooterProps {
  /** Real display name when a module has one (e.g. from its own identity endpoint) — falls back to the session email. */
  displayName?: string;
  /** Second line under the name — role/department text, e.g. "Secretary", "EDC Coordinator". */
  subLabel: string;
  /** Named in the sign-out confirm dialog: "...access the {portalName} portal." */
  portalName: string;
  collapsed?: boolean;
  /** Opt-in: makes the avatar/name area clickable (e.g. Advisor's "view my profile" drawer). Omit for the plain, non-interactive block every other module uses. */
  onIdentityClick?: () => void;
  /** Opt-in: a second icon button next to sign-out for switching between two views of the same account/session (e.g. HoD ⇄ Faculty, for a HoD who also personally teaches/advises) — omit for every module that has only one view. */
  switchView?: SwitchViewAction;
}

/** The one identity + role-switch + sign-out block every module's sidebar uses — never hand-roll this block, import it. */
export function SidebarUserFooter({ displayName, subLabel, portalName, collapsed, onIdentityClick, switchView }: SidebarUserFooterProps) {
  const { session, logout } = useAuth();
  const name = displayName || session?.user.email || "?";
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  if (collapsed) {
    return (
      <div className="flex items-center justify-center border-t border-border-default p-3">
        <Avatar name={name} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-[11px] border-t border-border-default px-4 py-3.5")}>
      {onIdentityClick ? (
        <button
          type="button"
          onClick={onIdentityClick}
          className="flex min-w-0 flex-1 items-center gap-[11px] text-left"
        >
          <Avatar name={name} />
          <div className="min-w-0 flex-1 leading-[1.25]">
            <div className="truncate text-[13px] font-bold text-ink">{name}</div>
            <div className="text-[11px] text-muted">{subLabel}</div>
          </div>
        </button>
      ) : (
        <>
          <Avatar name={name} />
          <div className="min-w-0 flex-1 leading-[1.25]">
            <div className="truncate text-[13px] font-bold text-ink">{name}</div>
            <div className="text-[11px] text-muted">{subLabel}</div>
          </div>
        </>
      )}
      {switchView && (
        <IconButton icon={switchView.icon} size={34} iconSize={17} title={switchView.label} onClick={switchView.onClick} />
      )}
      <IconButton icon="logout" size={34} iconSize={17} title="Log out" onClick={() => setConfirmingLogout(true)} />

      <ConfirmDialog
        open={confirmingLogout}
        title="Sign out?"
        description={`You'll need to log in again to access the ${portalName} portal.`}
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        destructive
        onConfirm={logout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </div>
  );
}
