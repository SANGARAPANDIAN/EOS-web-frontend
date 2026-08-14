/**
 * Formats a Date's LOCAL calendar date as "YYYY-MM-DD". Deliberately never
 * goes through `toISOString()` for this — that converts to UTC first, which
 * silently shifts the date by a day in positive-UTC-offset timezones (e.g.
 * IST) for a large chunk of the day.
 */
export function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDateOnly(): string {
  return toIsoDateString(new Date());
}

/** Backend timetable convention: 1 (Monday) through 6 (Saturday); no Sunday classes. Returns null on Sunday. */
export function todayBackendDayOfWeek(): number | null {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? null : jsDay;
}

export function formatLongDate(date: Date = new Date(), includeYear = false): string {
  return date.toLocaleDateString(
    "en-IN",
    includeYear
      ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
      : { weekday: "long", day: "numeric", month: "long" },
  );
}

export function greetingForHour(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** "Today · 08:10" / "Yesterday · 16:40" / "04 Aug · 11:20" — calendar-day-aware, always keeps the time-of-day. */
export function formatDayAndTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const time = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });

  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((dayStart(now) - dayStart(date)) / 86_400_000);

  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Yesterday · ${time}`;
  return `${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · ${time}`;
}

export function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(isoDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatDisplayDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export interface MonthGridCell {
  iso: string | null;
  day: number | null;
}

/** Month grid padded with nulls so every row has 7 cells. Monday-first by default; pass "sunday" to start the week on Sunday instead. */
export function getMonthGrid(
  year: number,
  monthIndex: number,
  weekStartsOn: "monday" | "sunday" = "monday",
): MonthGridCell[][] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingBlanks = weekStartsOn === "sunday" ? firstOfMonth.getDay() : (firstOfMonth.getDay() + 6) % 7; // Mon=0..Sun=6, or Sun=0..Sat=6

  const cells: MonthGridCell[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push({ iso: null, day: null });
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toIsoDateString(new Date(year, monthIndex, day));
    cells.push({ iso, day });
  }
  while (cells.length % 7 !== 0) cells.push({ iso: null, day: null });

  const weeks: MonthGridCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** "08:45" -> "8:45 am", "13:30" -> "1:30 pm". */
export function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Derives the "20XX–YY" academic-year label from a semester's start date and
 * parity, following the standard Indian academic-calendar convention: odd
 * semesters (Jul-Dec) belong to academic year Y-(Y+1); even semesters
 * (Jan-May) belong to the academic year that started the *previous* calendar
 * year, Y-1-Y. There's no direct "academic_year" field on /me/academic-calendar
 * to read this from directly.
 */
export function academicYearLabel(startDate: string | null, semester: number | null | undefined): string | undefined {
  if (!startDate || semester == null) return undefined;
  const startYear = new Date(startDate).getFullYear();
  const isOdd = semester % 2 === 1;
  const academicStartYear = isOdd ? startYear : startYear - 1;
  return `${academicStartYear}–${String(academicStartYear + 1).slice(2)}`;
}

export function monthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/**
 * "20XX–YY" label for whichever calendar year/month is being *viewed* —
 * unlike `academicYearLabel` above, this needs no student batch/semester;
 * it's just the standard Jun-start convention (Jun-Dec belongs to the year
 * that just started; Jan-May belongs to the year that started the previous
 * calendar year).
 */
export function viewedAcademicYearLabel(year: number, monthIndex: number): string {
  const startYear = monthIndex >= 5 ? year : year - 1;
  return `${startYear}–${String(startYear + 1).slice(2)}`;
}

/**
 * "Odd Semester" (Jul-Dec) / "Even Semester" (Jan-Jun) for *today* — used
 * where a real per-student semester parity (see `academicYearLabel` above)
 * isn't available because the viewer isn't scoped to one student/batch
 * (e.g. the sports-admin topbar, which is institution-wide). Standard
 * calendar convention, not tied to any one batch's actual start date.
 */
export function currentInstitutionSemesterParity(date: Date = new Date()): "Odd Semester" | "Even Semester" {
  return date.getMonth() >= 6 ? "Odd Semester" : "Even Semester";
}
