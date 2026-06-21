import { api } from "./client";
import type {
  AuditLog,
  AuthResponse,
  CompanySettings,
  DashboardSummary,
  Department,
  DepartmentPayload,
  Designation,
  DesignationPayload,
  Employee,
  EmployeePayload,
  EmploymentStatus,
  LeavePayload,
  LeaveRequest,
  LeaveStatus,
  PageResponse,
  UserSummary,
} from "../types";

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
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
  create: async (payload: EmployeePayload) => {
    const { data } = await api.post<Employee>("/employees", payload);
    return data;
  },
  update: async (id: number, payload: EmployeePayload) => {
    const { data } = await api.put<Employee>(`/employees/${id}`, payload);
    return data;
  },
  terminate: async (id: number) => {
    const { data } = await api.delete<{ message: string }>(`/employees/${id}`);
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
