/** Shared shapes reused across several sports-admin resources. */

export interface Ref {
  id: number;
  name: string;
}

export interface AchievementItem {
  title: string;
  meta: string;
  level: string | null;
  award: string;
}

export type SportsTeamStatus = "pending" | "confirmed";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type AttendanceMark = "present" | "absent" | "on_duty";
