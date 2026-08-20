import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference (EOSbackend1, audited AND smoke-tested live against a
// real seeded faculty account):
//   GET /api/v1/me/my-profile     -> ProfileController -> ProfileService.getFacultyProfile()  [200, works]
//   GET /api/v1/me/mentee-classes -> ClassMentorsController (FACULTY, HOD)                     [200, works]
//
// CONFIRMED BACKEND BUG (live-tested, not assumed): FacultyController
// declares `@Controller('me')` + `@Get('profile')`, which should map to
// GET /me/profile and return the faculty's own extended profile
// (first_name/last_name/phone/status/etc). In practice this route is
// unreachable — a DIFFERENT controller (a student-only "MeController")
// also registers GET /me/profile, and Nest's route-matching resolves to
// whichever controller was registered first, which returns
// 403 {"message":"Access denied. Required role(s): student"} for a valid
// faculty JWT. This is a genuine backend route-collision bug (two
// controllers claiming the same path), not a frontend wiring mistake — the
// fix is a one-line rename on the backend side (e.g. `@Get('faculty-profile')`
// on FacultyController), which was NOT applied here per "don't touch
// backend unnecessarily." Until then, this hook is retired and the advisor
// module gets identity fields from `/me/my-profile` alone (below) — it
// already covers name/designation/department/photo/resume/email/DOJ/
// reporting_to; only `phone`/`status`/raw first+last name split are lost,
// and no UI currently renders those.

export interface FacultyOwnProfile {
  first_name: string;
  last_name: string;
  designation: string | null;
  date_of_joining: string | null;
  status: string;
  email: string;
  phone: string | null;
  department: { id: number; name: string; code: string } | null;
}

/** @deprecated GET /me/profile is unreachable for a faculty JWT due to a
 * confirmed backend route collision — see the file-level comment above.
 * Kept only so the type is documented; do not call this hook. */
export function useFacultyOwnProfile() {
  return useQuery({
    queryKey: ["faculty", "profile"],
    queryFn: () => apiClient.get<FacultyOwnProfile>("/me/profile"),
    enabled: false,
  });
}

export interface MyProfileSocialLink {
  id: number;
  title: string;
  url: string;
}

export interface MyFacultyProfile {
  role: "faculty";
  name: string;
  id_no: string;
  designation: string | null;
  department: { id: number; name: string; code: string } | null;
  photo_url: string | null;
  resume_url: string | null;
  work_email: string;
  date_of_joining: string | null;
  reporting_to: string | null;
  social_links: MyProfileSocialLink[];
}

/** GET /me/my-profile */
export function useMyFacultyProfile() {
  return useQuery({
    queryKey: ["me", "my-profile"],
    queryFn: () => apiClient.get<MyFacultyProfile>("/me/my-profile"),
  });
}

// Exact shape confirmed from ClassMentorsService.toMenteeClassResponse —
// there is no student_count field; derive it from students.length.
export interface MenteeClass {
  class_id: number;
  label: string;
  section: string;
  department: { id: number; name: string; code: string };
  academic_year: string;
  students: { id: number; student_id_no: string; name: string }[];
}

/** GET /me/mentee-classes — empty array means this faculty is not an
 * advisor/class-mentor for any class this academic year. */
export function useMenteeClasses() {
  return useQuery({
    queryKey: ["me", "mentee-classes"],
    queryFn: () => apiClient.get<MenteeClass[]>("/me/mentee-classes"),
  });
}

/** Derives the "is this faculty an advisor to any class" gate the design's
 * "MY CLASS" nav group is conditioned on. Loading state is surfaced so the
 * caller can avoid a flash of the group before the real answer is known. */
export function useIsClassAdvisor() {
  const q = useMenteeClasses();
  return {
    isAdvisor: (q.data?.length ?? 0) > 0,
    isLoading: q.isLoading,
    classes: q.data ?? [],
  };
}
