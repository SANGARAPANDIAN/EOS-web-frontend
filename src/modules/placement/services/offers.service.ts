import { apiClient } from "@/lib/api/client";
import type { Offer, OfferResponseStatus } from "../types";

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
export const offersService = {
  async list(): Promise<Offer[]> {
    const rows = await apiClient.get<BackendOffer[]>("/drives/offers");
    return rows.map(toOffer);
  },
};
