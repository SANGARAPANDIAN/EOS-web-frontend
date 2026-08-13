"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { apiClient } from "@/lib/api/client";
import {
  useFacultyFolders,
  useCreateFolder,
  useFolderResources,
  useAddLinkResource,
  useAddFileResource,
  useFacultyTasks,
  useCreateLmsTask,
  useTaskSubmissions,
  useFacultyLessonPlan,
  useCreateLessonSession,
} from "@/modules/advisor/api/lms";

// CONNECTED FOR REAL — all three tabs (Material/Task/Lesson plan) previously
// rendered entirely fabricated sample content behind TODO(backend) comments
// claiming no such endpoint existed. That claim was wrong: GET/POST
// /me/lms/my-subjects/:id/folders, /tasks, /lesson-plan, and
// /tasks/:id/submissions are real, faculty-accessible endpoints
// (LmsController, @Roles(FACULTY, HOD)) that were simply never wired up
// here. Every folder/file/task/submission/lesson-session below is now real.

interface CurrentSemesterSubject {
  subject_id: number;
  subject_code: string;
  subject_name: string;
  class_id: number;
  section: string;
  semester: number;
  hours_per_week: number;
  tasks: number;
  materials: number;
}

function useCurrentSemester() {
  return useQuery({
    queryKey: ["me", "current-semester"],
    queryFn: () => apiClient.get<{ academic_year: string | null; subjects: CurrentSemesterSubject[] }>("/me/current-semester"),
  });
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

function tabButtonStyle(active: boolean) {
  return {
    padding: "13px 22px",
    borderRadius: 11,
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
    background: active ? "#1D4ED8" : "#fff",
    border: `1px solid ${active ? "#1D4ED8" : "#E2E8F0"}`,
    color: active ? "#fff" : "#0F172A",
    textAlign: "center" as const,
  };
}

export default function AdvisorCurrentSemesterPage() {
  const { data, isLoading } = useCurrentSemester();
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [tab, setTab] = useState<"material" | "task" | "lesson">("material");
  const [folderId, setFolderId] = useState<number | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);

  const subjects = data?.subjects ?? [];
  const subject = subjects.find((s) => s.subject_id === subjectId);

  // Every class this faculty teaches THIS subject in — GET /me/current-semester
  // already returns one row per (class, subject) combo, so every class
  // sharing this subject_id is exactly the set the backend's own
  // assertTeachesAllClasses will accept for class_ids. Folders/tasks can be
  // shared to any subset of these, not hardcoded to a single class.
  const classOptions = subjects.filter((s) => s.subject_id === subject?.subject_id);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  function toggleClass(classId: number) {
    setSelectedClassIds((prev) => (prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]));
  }

  const folders = useFacultyFolders(subject?.subject_id);
  const createFolder = useCreateFolder();
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");

  const activeFolderId = folderId ?? folders.data?.[0]?.id ?? null;
  const activeFolder = folders.data?.find((f) => f.id === activeFolderId);
  const resources = useFolderResources(activeFolderId ?? undefined);
  const addLink = useAddLinkResource();
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const addFile = useAddFileResource();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tasks = useFacultyTasks(subject?.subject_id, subject?.class_id);
  const createTask = useCreateLmsTask();
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskMaxMarks, setNewTaskMaxMarks] = useState("");

  const activeTaskId = taskId ?? tasks.data?.[0]?.id ?? null;
  const activeTask = tasks.data?.find((t) => t.id === activeTaskId);
  const submissions = useTaskSubmissions(activeTaskId ?? undefined);

  const lessonPlan = useFacultyLessonPlan(subject?.subject_id, subject?.class_id);
  const createSession = useCreateLessonSession();
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTopic, setSessionTopic] = useState("");

  if (!subject) {
    return (
      <div style={{ width: "100%" }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Current Semester</div>
        <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
          {data?.academic_year ?? ""} · open a subject to manage material, tasks and lesson plan
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: 16, marginTop: 20 }}>
          {subjects.map((s) => (
            <div key={`${s.class_id}-${s.subject_id}`} data-advisor-lift="" onClick={() => setSubjectId(s.subject_id)} style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 11, background: "#EFF6FF", color: "#1D4ED8", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {s.subject_code.slice(0, 2)}
                </div>
                <div style={{ flex: "1 1 auto", minWidth: 120 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>{s.subject_name}</div>
                  <div style={{ fontSize: 12.5, color: "#94A3B8", fontWeight: 600, marginTop: 3, fontFamily: "ui-monospace, monospace" }}>
                    {s.subject_code} · {s.section}
                  </div>
                </div>
                {s.hours_per_week > 0 && (
                  <div style={{ padding: "5px 11px", borderRadius: 20, background: "#EFF6FF", color: "#1D4ED8", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", flex: "0 0 auto" }}>{s.hours_per_week} hrs/wk</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 16, fontSize: 12.5, color: "#7C8899", fontWeight: 600 }}>
                <div>{s.materials} material{s.materials === 1 ? "" : "s"}</div>
                <div>{s.tasks} task{s.tasks === 1 ? "" : "s"}</div>
              </div>
            </div>
          ))}
          {subjects.length === 0 && !isLoading && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>No subjects mapped for the current semester.</div>
          )}
        </div>
      </div>
    );
  }

  function openNewFolder() {
    setSelectedClassIds(subject ? [subject.class_id] : []);
    setNewFolderTitle("");
    setNewFolderDescription("");
    setShowNewFolder(true);
  }

  function submitNewFolder() {
    if (!newFolderTitle.trim() || !subject || selectedClassIds.length === 0) return;
    createFolder.mutate(
      { subject_id: subject.subject_id, title: newFolderTitle.trim(), description: newFolderDescription.trim() || undefined, class_ids: selectedClassIds },
      { onSuccess: (res) => { setNewFolderTitle(""); setNewFolderDescription(""); setShowNewFolder(false); setFolderId(res.id); } },
    );
  }

  function submitAddLink() {
    if (!linkTitle.trim() || !linkUrl.trim() || !activeFolderId) return;
    addLink.mutate(
      { folderId: activeFolderId, title: linkTitle.trim(), link_url: linkUrl.trim() },
      { onSuccess: () => { setLinkTitle(""); setLinkUrl(""); setShowAddLink(false); } },
    );
  }

  function openNewTask() {
    setSelectedClassIds(subject ? [subject.class_id] : []);
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskDueDate("");
    setNewTaskMaxMarks("");
    setShowNewTask(true);
  }

  function submitNewTask() {
    if (!newTaskTitle.trim() || !subject || selectedClassIds.length === 0) return;
    createTask.mutate(
      {
        subject_id: subject.subject_id,
        class_ids: selectedClassIds,
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        due_date: newTaskDueDate || undefined,
        max_marks: newTaskMaxMarks ? Number(newTaskMaxMarks) : undefined,
        task_type: "assignment",
      },
      {
        onSuccess: (res) => {
          setNewTaskTitle("");
          setNewTaskDescription("");
          setNewTaskDueDate("");
          setNewTaskMaxMarks("");
          setShowNewTask(false);
          if (res[0]) setTaskId(res[0].id);
        },
      },
    );
  }

  function submitAddSession() {
    if (!sessionDate || !sessionTopic.trim() || !subject) return;
    createSession.mutate(
      { subject_id: subject.subject_id, class_id: subject.class_id, session_date: sessionDate, topic: sessionTopic.trim() },
      { onSuccess: () => { setSessionDate(""); setSessionTopic(""); setShowAddSession(false); } },
    );
  }

  const coveredCount = (lessonPlan.data?.sessions ?? []).filter((s) => s.is_covered).length;
  const totalSessions = (lessonPlan.data?.sessions ?? []).length;
  const progressPct = totalSessions ? Math.round((coveredCount / totalSessions) * 100) : 0;

  return (
    <div style={{ width: "100%" }}>
      <div onClick={() => setSubjectId(null)} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: "#1D4ED8", cursor: "pointer" }}>
        ← All subjects
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>{subject.subject_name}</div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
            {subject.subject_code} · {subject.section} · {subject.hours_per_week || "—"} hrs / week
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div data-advisor-lift="" onClick={() => setTab("material")} style={tabButtonStyle(tab === "material")}>
            Material
          </div>
          <div data-advisor-lift="" onClick={() => setTab("task")} style={tabButtonStyle(tab === "task")}>
            Task
          </div>
          <div data-advisor-lift="" onClick={() => setTab("lesson")} style={tabButtonStyle(tab === "lesson")}>
            Lesson
            <br />
            plan
          </div>
        </div>
      </div>

      {tab === "material" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16, marginTop: 20, alignItems: "start" }}>
          <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>YOUR FOLDERS</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#1D4ED8" }}>{(folders.data ?? []).length}</div>
            </div>
            {showNewFolder ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14, padding: 14, background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#1D4ED8" }}>NEW FOLDER</div>
                <input
                  value={newFolderTitle}
                  onChange={(e) => setNewFolderTitle(e.target.value)}
                  placeholder="Folder title"
                  style={{ height: 42, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 12px", fontFamily: "inherit", fontSize: 13.5, background: "#fff" }}
                />
                <textarea
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  placeholder="Description (optional)"
                  style={{ height: 56, border: "1px solid #DDE3EC", borderRadius: 10, padding: "10px 12px", fontFamily: "inherit", fontSize: 13.5, background: "#fff", resize: "vertical" }}
                />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Share to classes</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {classOptions.map((c) => {
                      const active = selectedClassIds.includes(c.class_id);
                      return (
                        <div
                          key={c.class_id}
                          onClick={() => toggleClass(c.class_id)}
                          style={{ padding: "6px 13px", borderRadius: 20, fontSize: 12, fontWeight: 800, cursor: "pointer", background: active ? "#1D4ED8" : "#fff", border: `1px solid ${active ? "#1D4ED8" : "#E2E8F0"}`, color: active ? "#fff" : "#475569" }}
                        >
                          {c.section}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div onClick={() => setShowNewFolder(false)} style={{ flex: 1, textAlign: "center", padding: 11, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer" }}>
                    Cancel
                  </div>
                  <div onClick={submitNewFolder} style={{ flex: 1, textAlign: "center", padding: 11, background: "#1D4ED8", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {createFolder.isPending ? "Creating…" : "Create"}
                  </div>
                </div>
              </div>
            ) : (
              <div onClick={openNewFolder} style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 14, padding: "13px 15px", border: "1.5px dashed #C7D2E4", borderRadius: 11, color: "#1D4ED8", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1D4ED8", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>+</div>
                Create new folder
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {(folders.data ?? []).map((f) => {
                const active = activeFolderId === f.id;
                return (
                  <div
                    key={f.id}
                    data-advisor-lift=""
                    onClick={() => setFolderId(f.id)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 13px", borderRadius: 11, cursor: "pointer", background: active ? "#EFF6FF" : "transparent", border: `1px solid ${active ? "#DBEAFE" : "transparent"}` }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 34px" }}>
                      <div style={{ width: 14, height: 11, border: "2px solid #1D4ED8", borderRadius: 3 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{f.title}</div>
                      {f.description && <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 3 }}>{f.description}</div>}
                      <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 3 }}>
                        {f.resource_count} item{f.resource_count === 1 ? "" : "s"} · shared to {f.classes.map((c) => c.label).join(", ") || "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(folders.data ?? []).length === 0 && !folders.isLoading && (
                <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600, padding: "12px 0" }}>No folders yet.</div>
              )}
            </div>
          </div>

          <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>{activeFolder?.title ?? "No folder selected"}</div>
              <div style={{ fontSize: 12.5, color: "#7C8899", fontWeight: 600 }}>{(resources.data ?? []).length} items in this folder</div>
            </div>
            {activeFolderId && (
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || !activeFolderId) return;
                    addFile.mutate({ folderId: activeFolderId, title: file.name, file });
                    e.target.value = "";
                  }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ flex: 1, textAlign: "center", padding: 12, background: "#EFF6FF", border: "1px solid #DBEAFE", borderRadius: 10, color: addFile.isPending ? "#93C5FD" : "#1D4ED8", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
                >
                  {addFile.isPending ? "Uploading…" : "Upload file"}
                </div>
                <div onClick={() => setShowAddLink((v) => !v)} style={{ flex: 1, textAlign: "center", padding: 12, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, color: "#475569", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                  Add link
                </div>
              </div>
            )}
            {showAddLink && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                <input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Link title" style={{ height: 42, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 12px", fontFamily: "inherit", fontSize: 13.5 }} />
                <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" style={{ height: 42, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 12px", fontFamily: "inherit", fontSize: 13.5 }} />
                <div onClick={submitAddLink} style={{ padding: "10px 16px", background: "#1D4ED8", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center" }}>
                  {addLink.isPending ? "Adding…" : "Add"}
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 12 }}>
              {(resources.data ?? []).map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 0", borderBottom: "1px solid #F4F6FA" }}>
                  <div style={{ width: 22, height: 22, border: "1.5px solid #CBD5E1", borderRadius: 6, flex: "0 0 22px" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{item.title}</div>
                    <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>Added {fmtDate(item.created_at)}</div>
                  </div>
                  <div style={{ padding: "5px 12px", borderRadius: 20, background: "#EFF6FF", border: "1px solid #DBEAFE", color: "#1D4ED8", fontSize: 11, fontWeight: 800 }}>{item.resource_type.toUpperCase()}</div>
                  <a href={item.link_url ?? item.file_url ?? "#"} target="_blank" rel="noreferrer" style={{ padding: "8px 15px", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569" }}>
                    Open
                  </a>
                </div>
              ))}
              {activeFolderId && (resources.data ?? []).length === 0 && !resources.isLoading && (
                <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600, padding: "12px 0" }}>No items in this folder yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "task" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16, marginTop: 20, alignItems: "start" }}>
          <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>TASKS &amp; ASSIGNMENTS</div>
            {showNewTask ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14, padding: 14, background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#1D4ED8" }}>NEW TASK</div>
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Title (e.g. Assignment 3 · Unit 3)"
                  style={{ height: 42, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 12px", fontFamily: "inherit", fontSize: 13.5, background: "#fff" }}
                />
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Description (optional)"
                  style={{ height: 64, border: "1px solid #DDE3EC", borderRadius: 10, padding: "10px 12px", fontFamily: "inherit", fontSize: 13.5, background: "#fff", resize: "vertical" }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>Due date</div>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      style={{ width: "100%", height: 42, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 12px", fontFamily: "inherit", fontSize: 13.5, background: "#fff" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>Max marks</div>
                    <input
                      value={newTaskMaxMarks}
                      onChange={(e) => setNewTaskMaxMarks(e.target.value.replace(/\D/g, ""))}
                      placeholder="20"
                      style={{ width: "100%", height: 42, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 12px", fontFamily: "inherit", fontSize: 13.5, background: "#fff" }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Share to classes</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {classOptions.map((c) => {
                      const active = selectedClassIds.includes(c.class_id);
                      return (
                        <div
                          key={c.class_id}
                          onClick={() => toggleClass(c.class_id)}
                          style={{ padding: "6px 13px", borderRadius: 20, fontSize: 12, fontWeight: 800, cursor: "pointer", background: active ? "#1D4ED8" : "#fff", border: `1px solid ${active ? "#1D4ED8" : "#E2E8F0"}`, color: active ? "#fff" : "#475569" }}
                        >
                          {c.section}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div onClick={() => setShowNewTask(false)} style={{ flex: 1, textAlign: "center", padding: 11, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer" }}>
                    Cancel
                  </div>
                  <div onClick={submitNewTask} style={{ flex: 1, textAlign: "center", padding: 11, background: "#1D4ED8", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {createTask.isPending ? "Creating…" : "Create"}
                  </div>
                </div>
              </div>
            ) : (
              <div onClick={openNewTask} style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 14, padding: "13px 15px", border: "1.5px dashed #C7D2E4", borderRadius: 11, color: "#1D4ED8", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1D4ED8", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>+</div>
                Create new task
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {(tasks.data ?? []).map((t) => {
                const active = activeTaskId === t.id;
                return (
                  <div
                    key={t.id}
                    data-advisor-lift=""
                    onClick={() => setTaskId(t.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 13px", borderRadius: 11, cursor: "pointer", background: active ? "#EFF6FF" : "transparent", border: `1px solid ${active ? "#DBEAFE" : "transparent"}` }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{t.title}</div>
                      <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 3 }}>
                        {t.due_date ? `Due ${fmtDate(t.due_date)}` : "No due date"}{t.max_marks ? ` · max ${t.max_marks} marks` : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#1D4ED8", whiteSpace: "nowrap" }}>{t.submitted_count}</div>
                  </div>
                );
              })}
              {(tasks.data ?? []).length === 0 && !tasks.isLoading && (
                <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600, padding: "12px 0" }}>No tasks yet.</div>
              )}
            </div>
          </div>

          <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>{activeTask?.title ?? "No task selected"}</div>
              <div style={{ fontSize: 12.5, color: "#7C8899", fontWeight: 600 }}>
                {(submissions.data ?? []).filter((r) => r.is_submitted).length} of {(submissions.data ?? []).length} submitted
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 14 }}>
              {(submissions.data ?? []).map((r) => (
                <div key={r.student_id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 0", borderBottom: "1px solid #F4F6FA" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#EFF6FF", color: "#1D4ED8", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 34px" }}>
                    {r.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>{r.student_id_no}</div>
                  </div>
                  {r.submission_file_url ? (
                    <a href={r.submission_file_url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: "#1D4ED8" }}>View submission</a>
                  ) : (
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#CBD5E1" }}>—</div>
                  )}
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0F172A", width: 60, textAlign: "right" }}>{r.marks_obtained !== null ? r.marks_obtained : "—"}</div>
                  <div style={{ padding: "5px 12px", borderRadius: 20, background: r.is_submitted ? "#EFF6FF" : "#F8FAFC", border: `1px solid ${r.is_submitted ? "#DBEAFE" : "#E2E8F0"}`, color: r.is_submitted ? "#1D4ED8" : "#94A3B8", fontSize: 11, fontWeight: 800 }}>
                    {r.is_submitted ? "SUBMITTED" : "NOT SUBMITTED"}
                  </div>
                </div>
              ))}
              {activeTaskId && (submissions.data ?? []).length === 0 && !submissions.isLoading && (
                <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600, padding: "12px 0" }}>No submissions to show yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "lesson" && (
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22, marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div onClick={() => setShowAddSession((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 18px", border: "1.5px dashed #C7D2E4", borderRadius: 11, color: "#1D4ED8", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1D4ED8", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>+</div>
              Add session
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: "#475569" }}>
                <div>Syllabus progress</div>
                <div style={{ color: "#1D4ED8" }}>{progressPct}%</div>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: "#EDF1F7", marginTop: 8, overflow: "hidden" }}>
                <div style={{ width: `${progressPct}%`, height: "100%", borderRadius: 8, background: "#1D4ED8" }} />
              </div>
            </div>
          </div>
          {showAddSession && (
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} style={{ height: 42, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 12px", fontFamily: "inherit", fontSize: 13.5 }} />
              <input value={sessionTopic} onChange={(e) => setSessionTopic(e.target.value)} placeholder="Topic" style={{ flex: 1, minWidth: 200, height: 42, border: "1px solid #DDE3EC", borderRadius: 10, padding: "0 12px", fontFamily: "inherit", fontSize: 13.5 }} />
              <div onClick={submitAddSession} style={{ padding: "10px 20px", background: "#1D4ED8", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {createSession.isPending ? "Adding…" : "Add"}
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 18 }}>
            {(lessonPlan.data?.sessions ?? []).map((l) => {
              const d = new Date(l.session_date);
              return (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: "1px solid #F4F6FA" }}>
                  <div style={{ width: 52, textAlign: "center", flex: "0 0 52px" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#1D4ED8" }}>{String(d.getDate()).padStart(2, "0")}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: "#94A3B8", letterSpacing: "0.08em" }}>{d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{l.topic}</div>
                    {l.unit_title && <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 3 }}>{l.unit_title}</div>}
                  </div>
                  <div
                    style={{
                      padding: "5px 12px",
                      borderRadius: 20,
                      background: l.is_covered ? "#EFF6FF" : "#F8FAFC",
                      border: `1px solid ${l.is_covered ? "#DBEAFE" : "#E2E8F0"}`,
                      color: l.is_covered ? "#1D4ED8" : "#94A3B8",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {l.is_covered ? "COVERED" : "PLANNED"}
                  </div>
                </div>
              );
            })}
            {(lessonPlan.data?.sessions ?? []).length === 0 && !lessonPlan.isLoading && (
              <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600, padding: "12px 0" }}>No lesson sessions recorded yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
