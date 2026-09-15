"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { friendlyError } from "@/lib/utils/errors";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { Badge, Button, Card, DatePicker, PageHeader, Typeahead, useToast } from "@/modules/admin/components/ui";
import { useBookSearch, type BookSearchResult } from "@/modules/library/api/books";
import { useCreateBorrowRecord, type BorrowerType } from "@/modules/library/api/borrowRecords";
import { useLibrarySettings } from "@/modules/library/api/settings";
import { useStudentNoDues, useStudentSearch, type StudentSearchResult } from "@/modules/library/api/studentLookup";
import { useFacultySearch, type FacultySearchResult } from "@/modules/library/api/facultyLookup";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function IssueBooksPage() {
  const { show } = useToast();
  const [borrowerType, setBorrowerType] = useState<BorrowerType>("student");
  const [studentQuery, setStudentQuery] = useState("");
  const [facultyQuery, setFacultyQuery] = useState("");
  const [bookQuery, setBookQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<FacultySearchResult | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [dueDate, setDueDate] = useState("");

  const debouncedStudentQuery = useDebouncedValue(studentQuery);
  const debouncedFacultyQuery = useDebouncedValue(facultyQuery);
  const debouncedBookQuery = useDebouncedValue(bookQuery);

  const { data: studentResults, isFetching: studentsLoading } = useStudentSearch(debouncedStudentQuery);
  const { data: facultyResults, isFetching: facultyLoading } = useFacultySearch(debouncedFacultyQuery);
  const { data: bookResults, isFetching: booksLoading } = useBookSearch(debouncedBookQuery);
  const { data: noDues, isLoading: noDuesLoading } = useStudentNoDues(selectedStudent?.id);
  const { data: settings } = useLibrarySettings();
  const createBorrowRecord = useCreateBorrowRecord();

  const defaultDueDate = useMemo(
    () => (settings ? addDaysIso(settings.default_borrowing_days) : addDaysIso(14)),
    [settings],
  );

  const effectiveDueDate = dueDate || defaultDueDate;
  const selectedBorrower = borrowerType === "student" ? selectedStudent : selectedFaculty;

  function selectBorrowerType(type: BorrowerType) {
    setBorrowerType(type);
    setSelectedStudent(null);
    setSelectedFaculty(null);
    setStudentQuery("");
    setFacultyQuery("");
  }

  function selectStudent(student: StudentSearchResult) {
    setSelectedStudent(student);
    setStudentQuery("");
  }

  function selectFaculty(faculty: FacultySearchResult) {
    setSelectedFaculty(faculty);
    setFacultyQuery("");
  }

  function selectBook(book: BookSearchResult) {
    // A copy with none available can still appear in the search results
    // (a title-level match) — silently refuse selecting it here rather than
    // hiding it from results outright, matching the old workflow's disabled
    // (not removed) treatment for out-of-stock titles.
    if (book.available_copies <= 0) return;
    setSelectedBook(book);
    setBookQuery("");
  }

  function resetForm() {
    setSelectedStudent(null);
    setSelectedFaculty(null);
    setSelectedBook(null);
    setDueDate("");
    setStudentQuery("");
    setFacultyQuery("");
    setBookQuery("");
  }

  function handleIssue() {
    if (!selectedBorrower || !selectedBook) return;
    createBorrowRecord.mutate(
      {
        book_id: selectedBook.id,
        borrower_type: borrowerType,
        student_id: borrowerType === "student" ? selectedBorrower.id : undefined,
        faculty_id: borrowerType === "faculty" ? selectedBorrower.id : undefined,
        due_date: effectiveDueDate,
      },
      {
        onSuccess: () => {
          show(`"${selectedBook.title}" issued to ${selectedBorrower.name}.`, "success");
          resetForm();
        },
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  const isPending = createBorrowRecord.isPending;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Issue books"
        description="Look up a student, pick an available copy and set the due date."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card hoverable={false} className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-admin-ink">1. Borrower</h3>
            {!selectedBorrower && (
              <div className="flex gap-1 rounded-admin-md border border-admin-border p-0.5">
                <button
                  type="button"
                  onClick={() => selectBorrowerType("student")}
                  className={`rounded-admin-sm px-2.5 py-1 text-xs font-semibold ${borrowerType === "student" ? "bg-admin-primary text-white" : "text-admin-muted"}`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => selectBorrowerType("faculty")}
                  className={`rounded-admin-sm px-2.5 py-1 text-xs font-semibold ${borrowerType === "faculty" ? "bg-admin-primary text-white" : "text-admin-muted"}`}
                >
                  Faculty
                </button>
              </div>
            )}
          </div>

          {!selectedBorrower ? (
            borrowerType === "student" ? (
              <>
                <Typeahead
                  value={studentQuery}
                  onChange={setStudentQuery}
                  results={studentResults ?? []}
                  getKey={(s) => s.id}
                  isLoading={studentsLoading}
                  placeholder="Search by name, roll no, register no or email"
                  onSelect={selectStudent}
                  renderResult={(student) => (
                    <>
                      <span className="text-sm font-medium text-admin-ink">{student.name}</span>
                      <span className="text-xs text-admin-muted">
                        {student.student_id_no} · {student.department.code} · {student.course.name}
                      </span>
                    </>
                  )}
                />
                {studentQuery.trim().length > 0 && studentQuery.trim().length < 2 && (
                  <p className="mt-2 text-xs text-admin-subtle">Type at least 2 characters.</p>
                )}
              </>
            ) : (
              <>
                <Typeahead
                  value={facultyQuery}
                  onChange={setFacultyQuery}
                  results={facultyResults ?? []}
                  getKey={(f) => f.id}
                  isLoading={facultyLoading}
                  placeholder="Search by name, staff code or email"
                  onSelect={selectFaculty}
                  renderResult={(faculty) => (
                    <>
                      <span className="text-sm font-medium text-admin-ink">{faculty.name}</span>
                      <span className="text-xs text-admin-muted">
                        {faculty.staff_code ?? "—"} · {faculty.department?.code ?? "—"} · {faculty.designation ?? "—"}
                      </span>
                    </>
                  )}
                />
                {facultyQuery.trim().length > 0 && facultyQuery.trim().length < 2 && (
                  <p className="mt-2 text-xs text-admin-subtle">Type at least 2 characters.</p>
                )}
              </>
            )
          ) : (
            <div>
              <div className="flex items-start justify-between rounded-admin-lg border border-admin-border-hover bg-admin-tint-strong px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-medium text-admin-ink">{selectedBorrower.name}</p>
                  <p className="text-xs text-admin-muted">
                    {borrowerType === "student"
                      ? `${selectedStudent!.student_id_no} · ${selectedStudent!.department.name}`
                      : `${selectedFaculty!.staff_code ?? "—"} · ${selectedFaculty!.department?.name ?? "—"}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => (borrowerType === "student" ? setSelectedStudent(null) : setSelectedFaculty(null))}
                  className="text-admin-muted hover:text-admin-body"
                  aria-label="Change borrower"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>

              {borrowerType === "student" && (
                <>
                  {noDuesLoading && <p className="mt-3 text-xs text-admin-muted">Checking library standing…</p>}
                  {noDues && (
                    <div className="mt-3 flex flex-col gap-2">
                      <div>
                        <Badge tone={noDues.has_outstanding_library_dues ? "warning" : "success"}>
                          {noDues.has_outstanding_library_dues ? "Has outstanding dues" : "Clear"}
                        </Badge>
                      </div>
                      {noDues.overdue_books.length > 0 && (
                        <p className="text-xs text-admin-danger">
                          {noDues.overdue_books.length} overdue book(s) — issuing more books may be blocked.
                        </p>
                      )}
                      {noDues.unpaid_fine_records.length > 0 && (
                        <p className="text-xs text-admin-warning-fg">
                          {noDues.unpaid_fine_records.length} unpaid fine(s) on record.
                        </p>
                      )}
                      {noDues.unsettled_lost_damaged_charges.length > 0 && (
                        <p className="text-xs text-admin-warning-fg">
                          {noDues.unsettled_lost_damaged_charges.length} unsettled lost/damaged charge(s).
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Card>

        <Card hoverable={false} className="p-5">
          <h3 className="mb-3 text-sm font-bold text-admin-ink">2. Book</h3>

          {!selectedBook ? (
            <>
              <Typeahead
                value={bookQuery}
                onChange={setBookQuery}
                results={bookResults ?? []}
                getKey={(b) => b.id}
                isLoading={booksLoading}
                placeholder="Search by title, author or accession"
                onSelect={selectBook}
                renderResult={(book) => (
                  <div className={book.available_copies <= 0 ? "opacity-50" : undefined}>
                    <span className="block text-sm font-medium text-admin-ink">{book.title}</span>
                    <span className="text-xs text-admin-muted">
                      {book.author ?? "Unknown author"} · {book.available_copies} of {book.total_copies} available
                      {book.available_copies <= 0 ? " · Unavailable" : ""}
                    </span>
                  </div>
                )}
              />
              {bookQuery.trim().length > 0 && bookQuery.trim().length < 2 && (
                <p className="mt-2 text-xs text-admin-subtle">Type at least 2 characters.</p>
              )}
            </>
          ) : (
            <div className="flex items-start justify-between rounded-admin-lg border border-admin-border-hover bg-admin-tint-strong px-3.5 py-2.5">
              <div>
                <p className="text-sm font-medium text-admin-ink">{selectedBook.title}</p>
                <p className="text-xs text-admin-muted">
                  {selectedBook.qr_code} · {selectedBook.available_copies} of {selectedBook.total_copies} available
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="text-admin-muted hover:text-admin-body"
                aria-label="Change book"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
        </Card>
      </div>

      <Card hoverable={false} className="flex flex-wrap items-end gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="issue-due-date" className="text-sm font-medium text-admin-body">
            Due date
          </label>
          <DatePicker
            id="issue-due-date"
            min={todayIso()}
            value={effectiveDueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <Button variant="primary" disabled={!selectedBorrower || !selectedBook || isPending} onClick={handleIssue}>
          <Icon name="check" size={16} /> {isPending ? "Issuing…" : "Issue book"}
        </Button>
      </Card>
    </div>
  );
}
