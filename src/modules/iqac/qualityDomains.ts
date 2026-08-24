/**
 * The 4 quality domains + their metrics, ported from the design source's
 * `Component.seed().sections` ("IQAC Module - Web/IQAC Dashboard.dc.html").
 * This is real, standing structure (every IQAC cell tracks these same
 * categories) — it's the domain/metric NAMES that are real here, not any
 * numbers. Each metric's actual figures (value/target/attainment) are what
 * still need real backend wiring, page by page — this catalog only drives
 * the sidebar + routing shell for now.
 */
export interface QualityMetric {
  key: string;
  label: string;
  icon: string;
}

export interface QualityDomain {
  key: string;
  label: string;
  icon: string;
  metrics: QualityMetric[];
}

export const QUALITY_DOMAINS: QualityDomain[] = [
  {
    key: "academic",
    label: "Academic Quality",
    icon: "menu_book",
    metrics: [
      { key: "attendance", label: "Attendance", icon: "event_available" },
      { key: "results", label: "Results", icon: "grading" },
      { key: "cgpa", label: "CGPA", icon: "insights" },
      { key: "course-attainment", label: "Course attainment", icon: "track_changes" },
      { key: "program-attainment", label: "Program attainment", icon: "flag" },
    ],
  },
  {
    key: "student",
    label: "Student Development",
    icon: "person_celebrate",
    metrics: [
      { key: "placements", label: "Placements", icon: "work" },
      { key: "certifications", label: "Certifications", icon: "workspace_premium" },
      { key: "awards", label: "Awards", icon: "military_tech" },
      { key: "competitions", label: "Competitions", icon: "emoji_events" },
      { key: "hackathons", label: "Hackathons", icon: "terminal" },
    ],
  },
  {
    key: "faculty",
    label: "Faculty Development",
    icon: "cast_for_education",
    metrics: [
      { key: "fdp", label: "FDP", icon: "school" },
      { key: "sttp", label: "STTP", icon: "menu_book" },
      { key: "certifications", label: "Certifications", icon: "workspace_premium" },
      { key: "publications", label: "Publications", icon: "article" },
      { key: "research", label: "Research", icon: "science" },
      { key: "patents", label: "Patents", icon: "verified" },
    ],
  },
  {
    key: "accreditation",
    label: "Accreditation",
    icon: "verified_user",
    metrics: [
      { key: "naac-progress", label: "NAAC progress", icon: "verified" },
      { key: "nba-progress", label: "NBA progress", icon: "shield" },
      { key: "aqar-progress", label: "AQAR progress", icon: "summarize" },
      { key: "ssr-progress", label: "SSR progress", icon: "description" },
    ],
  },
];
