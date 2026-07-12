export type RoleName = "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE";
export type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "PROBATION" | "TERMINATED";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type LeaveType = "ANNUAL" | "SICK" | "CASUAL" | "MATERNITY" | "PATERNITY" | "UNPAID";
export type WeekOffAssignmentType = "GROUP_WEEKLY" | "EMPLOYEE_DATE" | "EMPLOYEE_WEEKLY";
export type WeekDayName = "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface UserSummary {
  id: number;
  orgCode: string;
  email: string;
  fullName: string;
  role: RoleName;
}

export interface AppUser {
  id: number;
  username: string;
  employeeCode: string;
  fullName: string;
  role: RoleName;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppUserPayload {
  username: string;
  employeeCode: string;
  role: RoleName;
  enabled: boolean;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: UserSummary;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentPayload {
  name: string;
  code: string;
  description?: string;
  active: boolean;
}

export interface Designation {
  id: number;
  title: string;
  code: string;
  description?: string;
  departmentId: number;
  departmentName: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DesignationPayload {
  title: string;
  code: string;
  description?: string;
  departmentId: number;
  active: boolean;
}

export interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  joiningDate: string;
  baseSalary: number;
  bankAccountNumber?: string;
  taxIdentificationNumber?: string;
  address?: string;
  branchId?: number;
  branchName?: string;
  status: EmploymentStatus;
  departmentId: number;
  departmentName: string;
  designationId: number;
  designationTitle: string;
  hasProfilePhoto: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeePayload {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  joiningDate: string;
  baseSalary: number;
  bankAccountNumber?: string;
  taxIdentificationNumber?: string;
  address?: string;
  branchId?: number;
  status: EmploymentStatus;
  departmentId: number;
  designationId: number;
}

export type EmployeeCodeMode = "AUTO" | "MANUAL";

export interface EmployeeSettings {
  id: number;
  codeMode: EmployeeCodeMode;
  prefix: string;
  suffix: string;
  startingNumber: number;
  padding: number;
  updatedAt: string;
}

export interface EmployeeSettingsPayload {
  codeMode: EmployeeCodeMode;
  prefix: string;
  suffix?: string;
  startingNumber: number;
  padding: number;
}

export interface Branch {
  id: number;
  name: string;
  code?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchPayload {
  name: string;
  code?: string;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  reviewerEmail?: string;
  reviewerComment?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeavePayload {
  employeeId: number;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface CompanySettings {
  id: number;
  companyName: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  currency: string;
  timezone: string;
  payrollCutoffDay: number;
  updatedAt: string;
}

export interface DashboardSummary {
  totalEmployees: number;
  activeEmployees: number;
  activeDepartments: number;
  pendingLeaves: number;
  approvedLeavesThisMonth: number;
  recentLeaves: LeaveRequest[];
}

export interface AuditLog {
  id: number;
  actorEmail?: string;
  action: string;
  entityName?: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

export interface Shift {
  id: number;
  name: string;
  code: string;
  startTime: string;
  durationHours: number;
  durationMinutes: number;
  segments: ShiftSegment[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ShiftSegmentType = "WORK" | "BREAK";

export interface ShiftSegment {
  type: ShiftSegmentType;
  hours: number;
  minutes: number;
  graceMinutes: number;
}

export interface ShiftPayload {
  name: string;
  code: string;
  startTime: string;
  durationHours: number;
  durationMinutes: number;
  segments: ShiftSegment[];
  active: boolean;
}

export interface ShiftAssignment {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentId: number;
  departmentName: string;
  shiftId: number;
  shiftName: string;
  shiftCode: string;
  startTime: string;
  durationHours: number;
  durationMinutes: number;
  segments?: ShiftSegment[];
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftAssignmentPayload {
  employeeId: number;
  shiftId: number;
  startDate: string;
  endDate: string;
  overrideExisting: boolean;
}

export interface WeekOffAssignment {
  id: number;
  type: WeekOffAssignmentType;
  branchId?: number;
  branchName?: string;
  departmentId?: number;
  departmentName?: string;
  designationId?: number;
  designationTitle?: string;
  employeeId?: number;
  employeeCode?: string;
  employeeName?: string;
  dayOfWeek?: WeekDayName;
  date?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeekOffAssignmentPayload {
  type: WeekOffAssignmentType;
  branchId?: number;
  departmentId?: number;
  designationId?: number;
  employeeId?: number;
  dayOfWeeks?: WeekDayName[];
  dates?: string[];
}

export interface ApiError {
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface EmployeeDocument {
  id: number;
  employeeId: number;
  fileName: string;
  originalFileName: string;
  fileType: string;
  fileExtension: string;
  fileSize: number;
  documentCategory: string;
  uploadedAt: string;
  uploadedBy: string;
  profilePhoto: boolean;
  previewSupported: boolean;
}
