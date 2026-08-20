import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { placementKeys } from "./queryKeys";
import type { OfferResponseStatus } from "./types";

// An "offer" isn't a real table — it's derived from drive applications
// whose status is "placed" (see the backend's DrivesService.getOffers).
// Student/company/response/offeredPackageLpa are real; the offer letter has
// no backend storage anywhere, so that stays off this type. `releasedAt` is
// real — the same `updated_at` proxy used throughout this module.
export interface Offer {
  id: number;
  driveId: number;
  studentId: number;
  studentIdNo: string;
  rollNo: string | null;
  registerNo: string | null;
  studentName?: string;
  departmentName?: string;
  departmentCode?: string;
  companyName: string;
  jobRole?: string;
  /** The drive's advertised package — fall back to this until offeredPackageLpa is entered. */
  packageLpa?: number;
  /** The actual package offered to this specific student, editable once offerResponse is "accepted". */
  offeredPackageLpa?: number;
  offerResponse: OfferResponseStatus | null;
  /** Real once query.md #16 runs — null until then. */
  joiningDate: string | null;
  workLocation: string | null;
  releasedAt: string;
}

interface BackendOffer {
  id: number;
  drive_id: number;
  student_id: number;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  student_name: string | null;
  department_name: string | null;
  department_code: string | null;
  company_name: string;
  job_role: string | null;
  // Prisma Decimal fields serialize as strings over JSON, not numbers.
  package_lpa: string | null;
  offered_package_lpa: string | null;
  offer_response: OfferResponseStatus | null;
  released_at: string;
  joining_date: string | null;
  work_location: string | null;
}

function toOffer(o: BackendOffer): Offer {
  return {
    id: o.id,
    driveId: o.drive_id,
    studentId: o.student_id,
    studentIdNo: o.student_id_no,
    rollNo: o.roll_no,
    registerNo: o.register_no,
    studentName: o.student_name ?? undefined,
    departmentName: o.department_name ?? undefined,
    departmentCode: o.department_code ?? undefined,
    companyName: o.company_name,
    jobRole: o.job_role ?? undefined,
    packageLpa: o.package_lpa !== null ? Number(o.package_lpa) : undefined,
    offeredPackageLpa: o.offered_package_lpa == null ? undefined : Number(o.offered_package_lpa),
    offerResponse: o.offer_response,
    releasedAt: o.released_at,
    joiningDate: o.joining_date,
    workLocation: o.work_location,
  };
}

// One query server-side (DrivesService.getOffers) — replaces what used to be
// a client-side /drives list plus one /applications call per drive.
export function useOffers() {
  return useQuery({
    queryKey: placementKeys.offers(),
    queryFn: async () => {
      const rows = await apiClient.get<BackendOffer[]>("/drives/offers");
      return rows.map(toOffer);
    },
  });
}
