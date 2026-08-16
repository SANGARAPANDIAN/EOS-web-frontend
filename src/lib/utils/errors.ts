import { ApiError } from "@/types/api";

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_ALREADY_EXISTS: "This email is already registered to another account.",
  STUDENT_ID_NO_ALREADY_EXISTS: "This student ID is already in use.",
  ADMISSION_NO_ALREADY_EXISTS: "This admission number is already in use.",
  COURSE_NOT_FOUND: "The selected course no longer exists — pick another.",
  QUOTA_NOT_FOUND: "The selected quota no longer exists — pick another.",
  BATCH_NOT_FOUND: "The selected batch no longer exists — pick another.",
  TRANSPORT_STAGE_NOT_FOUND: "The selected transport stage no longer exists — pick another.",
  HOSTEL_ROOM_TYPE_NOT_FOUND: "The selected room type no longer exists — pick another.",
  PERFECT_ENTRY_ALREADY_DONE: "This application has already been completed.",
  PERFECT_ENTRY_NOT_ALLOWED: "The application isn't in the right state to complete admission.",
  INVALID_CUTOFF_RANGE: "A cut-off mark must be between 0 and 100.",
  MISSING_CONDITIONAL_FIELD: "A required field for the chosen residence type is missing.",
  APPLICATION_NOT_EDITABLE: "This application can no longer be edited from its current status.",
  APPLICATION_NOT_DELETABLE: "Only applications still in 'applied' status can be deleted.",
  SOA_APPLICATION_NOT_FOUND: "This application no longer exists.",
  INVALID_STATUS_TRANSITION: "That status change isn't allowed from here.",
  ADMIN_PASSWORD_INCORRECT: "That's not your current password.",
};

/** Maps a known backend errorCode to a friendlier sentence; falls back to the raw message, then a generic one. */
export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) return ERROR_MESSAGES[err.errorCode] ?? err.message;
  return "Something went wrong. Please try again.";
}
