import { api } from "./client";
import type {
  AppUser,
  AppUserPayload,
  AuditLog,
  AuthResponse,
  Branch,
  BranchPayload,
  CompanySettings,
  DashboardSummary,
  Department,
  DepartmentPayload,
  Designation,
  DesignationPayload,
  Employee,
  EmployeeDocument,
  EmployeeHierarchy,
  EmployeeHierarchyNode,
  EmployeeSettings,
  EmployeeSettingsPayload,
  EmployeePayload,
  Holiday,
  HolidayPayload,
  EmploymentStatus,
  LeavePayload,
  LeaveRequest,
  LeaveStatus,
  PageResponse,
  Shift,
  ShiftAssignment,
  ShiftAssignmentPayload,
  ShiftPayload,
  UserSummary,
  WeekOffAssignment,
  WeekOffAssignmentPayload,
  WeekOffAssignmentType,
  WeekOffExclusion,
  AttendanceSettings,
  AttendanceRecord,
} from "../types";

export const authApi = {
  login: async (orgCode: string, email: string, password: string) => {
    const { data } = await api.post<AuthResponse>("/auth/login", { orgCode, email, password });
    return data;
  },
  register: async (payload: { companyName: string; fullName: string; email: string; password: string }) => {
    const { data } = await api.post<AuthResponse>("/auth/register", payload);
    return data;
  },
  me: async () => {
    const { data } = await api.get<UserSummary>("/auth/me");
    return data;
  },
};

export const dashboardApi = {
  summary: async () => {
    const { data } = await api.get<DashboardSummary>("/dashboard/summary");
    return data;
  },
};

export const departmentApi = {
  search: async (params: { search?: string; active?: boolean; page?: number; size?: number }) => {
    const { data } = await api.get<PageResponse<Department>>("/departments", { params });
    return data;
  },
  active: async () => {
    const { data } = await api.get<Department[]>("/departments/active");
    return data;
  },
  create: async (payload: DepartmentPayload) => {
    const { data } = await api.post<Department>("/departments", payload);
    return data;
  },
  update: async (id: number, payload: DepartmentPayload) => {
    const { data } = await api.put<Department>(`/departments/${id}`, payload);
    return data;
  },
  deactivate: async (id: number) => {
    const { data } = await api.delete<{ message: string }>(`/departments/${id}`);
    return data;
  },
};

export const designationApi = {
  search: async (params: {
    search?: string;
    departmentId?: number;
    active?: boolean;
    page?: number;
    size?: number;
  }) => {
    const { data } = await api.get<PageResponse<Designation>>("/designations", { params });
    return data;
  },
  create: async (payload: DesignationPayload) => {
    const { data } = await api.post<Designation>("/designations", payload);
    return data;
  },
  update: async (id: number, payload: DesignationPayload) => {
    const { data } = await api.put<Designation>(`/designations/${id}`, payload);
    return data;
  },
  deactivate: async (id: number) => {
    const { data } = await api.delete<{ message: string }>(`/designations/${id}`);
    return data;
  },
};

export const employeeApi = {
  search: async (params: {
    search?: string;
    status?: EmploymentStatus | "";
    departmentId?: number;
    page?: number;
    size?: number;
  }) => {
    const { data } = await api.get<PageResponse<Employee>>("/employees", { params });
    return data;
  },
  get: async (id: number) => {
    const { data } = await api.get<Employee>(`/employees/${id}`);
    return data;
  },
  me: async () => {
    const { data } = await api.get<Employee>("/employees/me");
    return data;
  },
  hierarchy: async () => {
    const { data } = await api.get<EmployeeHierarchy>("/employees/me/hierarchy");
    return data;
  },
  organizationHierarchy: async () => {
    const { data } = await api.get<EmployeeHierarchyNode[]>("/employees/organization-hierarchy");
    return data;
  },
  create: async (payload: EmployeePayload) => {
    const { data } = await api.post<Employee>("/employees", payload);
    return data;
  },
  update: async (id: number, payload: EmployeePayload) => {
    const { data } = await api.put<Employee>(`/employees/${id}`, payload);
    return data;
  },
  updateMe: async (payload: EmployeePayload) => {
    const { data } = await api.put<Employee>("/employees/me", payload);
    return data;
  },
  terminate: async (id: number) => {
    const { data } = await api.delete<{ message: string }>(`/employees/${id}`);
    return data;
  },
  documents: async (id: number) => {
    const { data } = await api.get<EmployeeDocument[]>(`/employees/${id}/documents`);
    return data;
  },
  uploadDocument: async (
    id: number,
    payload: { file: File; documentCategory: string; replace?: boolean },
    onUploadProgress?: (progress: number) => void,
  ) => {
    const formData = new FormData();
    formData.append("file", payload.file);
    formData.append("documentCategory", payload.documentCategory);
    formData.append("replace", String(Boolean(payload.replace)));
    const { data } = await api.post<EmployeeDocument>(`/employees/${id}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total && onUploadProgress) {
          onUploadProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });
    return data;
  },
  deleteDocument: async (employeeId: number, documentId: number) => {
    const { data } = await api.delete<{ message: string }>(`/employees/${employeeId}/documents/${documentId}`);
    return data;
  },
  downloadDocument: async (employeeId: number, documentId: number) => {
    const { data } = await api.get<Blob>(`/employees/${employeeId}/documents/${documentId}/download`, { responseType: "blob" });
    return data;
  },
  previewDocument: async (employeeId: number, documentId: number) => {
    const { data } = await api.get<Blob>(`/employees/${employeeId}/documents/${documentId}/preview`, { responseType: "blob" });
    return data;
  },
  uploadProfilePhoto: async (id: number, file: File, onUploadProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post<EmployeeDocument>(`/employees/${id}/profile-photo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total && onUploadProgress) {
          onUploadProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });
    return data;
  },
  getProfilePhoto: async (id: number) => {
    const { data } = await api.get<Blob>(`/employees/${id}/profile-photo`, { responseType: "blob" });
    return data;
  },
  deleteProfilePhoto: async (id: number) => {
    const { data } = await api.delete<{ message: string }>(`/employees/${id}/profile-photo`);
    return data;
  },
};

export const leaveApi = {
  search: async (params: {
    search?: string;
    employeeId?: number;
    status?: LeaveStatus | "";
    page?: number;
    size?: number;
  }) => {
    const { data } = await api.get<PageResponse<LeaveRequest>>("/leaves", { params });
    return data;
  },
  create: async (payload: LeavePayload) => {
    const { data } = await api.post<LeaveRequest>("/leaves", payload);
    return data;
  },
  decide: async (id: number, status: LeaveStatus, reviewerComment?: string) => {
    const { data } = await api.patch<LeaveRequest>(`/leaves/${id}/decision`, {
      status,
      reviewerComment,
    });
    return data;
  },
};

export const settingsApi = {
  get: async () => {
    const { data } = await api.get<CompanySettings>("/settings/company");
    return data;
  },
  update: async (payload: Omit<CompanySettings, "id" | "updatedAt">) => {
    const { data } = await api.put<CompanySettings>("/settings/company", payload);
    return data;
  },
};

export const auditApi = {
  list: async (params: { page?: number; size?: number }) => {
    const { data } = await api.get<PageResponse<AuditLog>>("/audit-logs", { params });
    return data;
  },
};

export const employeeSettingsApi = {
  get: async () => {
    const { data } = await api.get<EmployeeSettings>("/settings/employee");
    return data;
  },
  update: async (payload: EmployeeSettingsPayload) => {
    const { data } = await api.put<EmployeeSettings>("/settings/employee", payload);
    return data;
  },
};

export const branchApi = {
  active: async () => {
    const { data } = await api.get<Branch[]>("/branches/active");
    return data;
  },
  create: async (payload: BranchPayload) => {
    const { data } = await api.post<Branch>("/branches", payload);
    return data;
  },
  update: async (id: number, payload: BranchPayload) => {
    const { data } = await api.put<Branch>(`/branches/${id}`, payload);
    return data;
  },
};

export const attendanceApi = {
  getSettings: async () => (await api.get<AttendanceSettings>("/attendance/settings")).data,
  updateSettings: async (payload: Omit<AttendanceSettings, "id" | "updatedAt">) => (await api.put<AttendanceSettings>("/attendance/settings", payload)).data,
  list: async (from: string, to: string) => (await api.get<AttendanceRecord[]>("/attendance", { params: { from, to } })).data,
  save: async (payload: { employeeId: number; date: string; clockIn?: string; clockOut?: string; source: string }) => (await api.post<AttendanceRecord>("/attendance", payload)).data,
};

export const shiftApi = {
  search: async (params: { search?: string; active?: boolean; page?: number; size?: number }) => {
    const { data } = await api.get<PageResponse<Shift>>("/shifts", { params });
    return data;
  },
  active: async () => {
    const { data } = await api.get<Shift[]>("/shifts/active");
    return data;
  },
  create: async (payload: ShiftPayload) => {
    const { data } = await api.post<Shift>("/shifts", payload);
    return data;
  },
  update: async (id: number, payload: ShiftPayload) => {
    const { data } = await api.put<Shift>(`/shifts/${id}`, payload);
    return data;
  },
  deactivate: async (id: number) => {
    const { data } = await api.delete<{ message: string }>(`/shifts/${id}`);
    return data;
  },
};

export const shiftAssignmentApi = {
  search: async (params: { employeeId?: number; startDate?: string; endDate?: string }) => {
    const { data } = await api.get<ShiftAssignment[]>("/shift-assignments", { params });
    return data;
  },
  create: async (payload: ShiftAssignmentPayload) => {
    const { data } = await api.post<ShiftAssignment[]>("/shift-assignments", payload);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete<{ message: string }>(`/shift-assignments/${id}`);
    return data;
  },
};

export const weekOffAssignmentApi = {
  search: async (params: { type?: WeekOffAssignmentType | ""; employeeId?: number }) => {
    const { data } = await api.get<WeekOffAssignment[]>("/week-off-assignments", { params });
    return data;
  },
  create: async (payload: WeekOffAssignmentPayload) => {
    const { data } = await api.post<WeekOffAssignment[]>("/week-off-assignments", payload);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete<{ message: string }>(`/week-off-assignments/${id}`);
    return data;
  },
};

export const weekOffExclusionApi = {
  search: async () => {
    const { data } = await api.get<WeekOffExclusion[]>("/week-off-exclusions");
    return data;
  },
  create: async (payload: { branchId: number; departmentId: number; designationId: number; date: string }) => {
    const { data } = await api.post<WeekOffExclusion>("/week-off-exclusions", payload);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete<{ message: string }>(`/week-off-exclusions/${id}`);
    return data;
  },
};

export const holidayApi = {
  search: async () => {
    const { data } = await api.get<Holiday[]>("/holidays");
    return data;
  },
  create: async (payload: HolidayPayload) => {
    const { data } = await api.post<Holiday>("/holidays", payload);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete<{ message: string }>(`/holidays/${id}`);
    return data;
  },
};

export const userApi = {
  search: async (params: { search?: string; enabled?: boolean; page?: number; size?: number }) => {
    const { data } = await api.get<PageResponse<AppUser>>("/users", { params });
    return data;
  },
  create: async (payload: AppUserPayload) => {
    const { data } = await api.post<AppUser>("/users", payload);
    return data;
  },
  update: async (id: number, payload: AppUserPayload) => {
    const { data } = await api.put<AppUser>(`/users/${id}`, payload);
    return data;
  },
  resetPassword: async (id: number) => {
    const { data } = await api.post<{ message: string }>(`/users/${id}/reset-password`);
    return data;
  },
};
