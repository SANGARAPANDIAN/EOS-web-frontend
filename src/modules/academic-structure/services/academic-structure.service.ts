import { apiClient } from "@/lib/api/client";
import type {
  AssignHodInput,
  Batch,
  ClassSubject,
  Course,
  CreateBatchInput,
  CreateClassInput,
  CreateCourseInput,
  CreateDepartmentInput,
  Department,
  FacultyOption,
  PaginatedResponse,
  SchoolClass,
  UpdateBatchInput,
  UpdateClassInput,
  UpdateCourseInput,
  UpdateDepartmentInput,
} from "../types";

export const academicStructureService = {
  // Departments
  listDepartments: (): Promise<Department[]> => apiClient.get("/departments"),
  createDepartment: (input: CreateDepartmentInput): Promise<Department> => apiClient.post("/departments", input),
  updateDepartment: (id: number, input: UpdateDepartmentInput): Promise<Department> =>
    apiClient.patch(`/departments/${id}`, input),
  deleteDepartment: (id: number): Promise<{ message: string }> => apiClient.delete(`/departments/${id}`),
  assignHod: (id: number, input: AssignHodInput): Promise<Department> =>
    apiClient.patch(`/departments/${id}/hod`, input),

  // Courses
  listCourses: (): Promise<Course[]> => apiClient.get("/courses"),
  createCourse: (input: CreateCourseInput): Promise<Course> => apiClient.post("/courses", input),
  updateCourse: (id: number, input: UpdateCourseInput): Promise<Course> => apiClient.patch(`/courses/${id}`, input),
  deleteCourse: (id: number): Promise<{ message: string }> => apiClient.delete(`/courses/${id}`),

  // Batches
  listBatches: (): Promise<Batch[]> => apiClient.get("/batches"),
  createBatch: (input: CreateBatchInput): Promise<Batch> => apiClient.post("/batches", input),
  updateBatch: (id: number, input: UpdateBatchInput): Promise<Batch> => apiClient.patch(`/batches/${id}`, input),
  deleteBatch: (id: number): Promise<{ message: string }> => apiClient.delete(`/batches/${id}`),

  // Classes
  listClasses: (): Promise<SchoolClass[]> => apiClient.get("/classes"),
  createClass: (input: CreateClassInput): Promise<SchoolClass> => apiClient.post("/classes", input),
  updateClass: (id: number, input: UpdateClassInput): Promise<SchoolClass> => apiClient.patch(`/classes/${id}`, input),
  deleteClass: (id: number): Promise<{ message: string }> => apiClient.delete(`/classes/${id}`),
  classSubjects: (id: number): Promise<ClassSubject[]> => apiClient.get(`/classes/${id}/subjects`),

  // Faculty lookup, scoped to a department — for the HoD picker.
  facultyInDepartment: (departmentId: number): Promise<PaginatedResponse<FacultyOption>> =>
    apiClient.get("/me/faculty", { department_id: departmentId, status: "active", limit: 100 }),
};
