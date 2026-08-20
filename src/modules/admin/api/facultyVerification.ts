import { apiClient } from "@/lib/api/client";

const BASE = "/me/faculty-verification";

export type OtpChannel = "sms" | "whatsapp";

/** Thin Twilio-Verify passthrough — no query-hook needed, called directly from OtpVerifyDialog. */
export function sendFacultyVerification(phone: string, channel: OtpChannel): Promise<{ status: string; channel: string; to: string }> {
  return apiClient.post(`${BASE}/send`, { phone, channel });
}

export function checkFacultyVerification(phone: string, code: string): Promise<{ status: string; valid: boolean }> {
  return apiClient.post(`${BASE}/check`, { phone, code });
}
