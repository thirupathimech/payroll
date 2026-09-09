export type RoleName = "ADMIN" | "HR" | "MANAGER" | "LEAD" | "EMPLOYEE";
export type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "PROBATION" | "TERMINATED";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type MissingPunchStatus = "PENDING" | "APPROVED" | "REJECTED";
export type MissingPunchType = "IN" | "OUT";
export type LeaveType = "ANNUAL" | "SICK" | "CASUAL" | "MATERNITY" | "PATERNITY" | "UNPAID";
export type WeekOffAssignmentType = "GROUP_WEEKLY" | "EMPLOYEE_DATE" | "EMPLOYEE_WEEKLY";
export type CalendarOffType = "HOLIDAY" | "WEEK_OFF";
export interface CalendarOffReportRow {
  date: string;
  day: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  branchId?: number;
  branchName?: string;
  departmentId: number;
  departmentName: string;
  designationId: number;
  designationTitle: string;
  calendarOff: string;
  appliedVia: string;
}
export interface WeekOffExclusion {
  id: number;
  branchId: number;
  branchName: string;
  departmentId: number;
  departmentName: string;
  designationId: number;
  designationTitle: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}
export interface Holiday {
  id: number;
  branchId: number;
  branchName: string;
  departmentId: number;
  departmentName: string;
  designationId: number;
  designationTitle: string;
  date: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
export interface HolidayPayload {
  branchId: number;
  departmentId: number;
  designationId: number;
  date: string;
  title: string;
}
export type WeekDayName = "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";
export type AttendanceMode = "MANUAL" | "PUNCHES";
export type SalaryComponentCategory = "EARNING" | "EMPLOYER_CONTRIBUTION" | "DEDUCTION";
export type SalaryValueType = "PERCENTAGE" | "FIXED";

export interface SalaryComponent {
  id: number;
  name: string;
  code: string;
  category: SalaryComponentCategory;
  valueType: SalaryValueType;
  defaultValue: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryComponentPayload {
  name: string;
  code: string;
  category: SalaryComponentCategory;
  valueType: SalaryValueType;
  defaultValue: number;
  enabled: boolean;
}

export interface EmployeeSalaryComponent {
  id?: number;
  componentId: number;
  name: string;
  code: string;
  category: SalaryComponentCategory;
  valueType: SalaryValueType;
  value: number;
  enabled: boolean;
}

export interface EmployeeSalaryResponse {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  branchName?: string;
  departmentName: string;
  designationTitle: string;
  ctc: number;
  components: EmployeeSalaryComponent[];
}

export interface EmployeeSalaryPayload {
  ctc: number;
  components: Array<{
    componentId: number;
    valueType: SalaryValueType;
    value: number;
    enabled: boolean;
  }>;
}

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
  employeeCode?: string;
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
  middleName?: string;
  lastName: string;
  fullName: string;
  email: string;
  personalEmail?: string;
  phone?: string;
  alternateMobileNumber?: string;
  gender?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  nationality?: string;
  aadhaarNumber?: string;
  dateOfBirth?: string;
  joiningDate: string;
  confirmationDate?: string;
  baseSalary: number;
  employmentType?: string;
  probationPeriod?: string;
  biometricId?: string;
  bankAccountNumber?: string;
  accountHolderName?: string;
  bankName?: string;
  ifscCode?: string;
  taxIdentificationNumber?: string;
  address?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyRelationship?: string;
  emergencyMobileNumber?: string;
  primarySkill?: string;
  secondarySkill?: string;
  certifications?: string;
  languagesKnown?: string;
  resignationDate?: string;
  lastWorkingDate?: string;
  exitReason?: string;
  relievingDate?: string;
  branchId?: number;
  branchName?: string;
  managerId?: number;
  managerEmployeeCode?: string;
  managerName?: string;
  hrManagerId?: number;
  hrManagerEmployeeCode?: string;
  hrManagerName?: string;
  status: EmploymentStatus;
  departmentId: number;
  departmentName: string;
  designationId: number;
  designationTitle: string;
  hasProfilePhoto: boolean;
  createdAt: string;
  updatedAt: string;
  education: EmployeeEducation[];
  experience: EmployeeExperience[];
}

export interface EmployeeEducation {
  id?: number;
  qualification?: string;
  institution?: string;
  university?: string;
  yearOfPassing?: string;
  score?: string;
  specialization?: string;
}

export interface EmployeeExperience {
  id?: number;
  company?: string;
  designation?: string;
  startDate?: string;
  endDate?: string;
  totalExperience?: string;
  lastDrawnSalary?: string;
  reasonForLeaving?: string;
}

export interface EmployeePayload {
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  personalEmail?: string;
  phone?: string;
  alternateMobileNumber?: string;
  gender?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  nationality?: string;
  aadhaarNumber?: string;
  dateOfBirth?: string;
  joiningDate: string;
  confirmationDate?: string;
  baseSalary: number;
  employmentType?: string;
  probationPeriod?: string;
  biometricId?: string;
  bankAccountNumber?: string;
  accountHolderName?: string;
  bankName?: string;
  ifscCode?: string;
  taxIdentificationNumber?: string;
  address?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyRelationship?: string;
  emergencyMobileNumber?: string;
  primarySkill?: string;
  secondarySkill?: string;
  certifications?: string;
  languagesKnown?: string;
  resignationDate?: string;
  lastWorkingDate?: string;
  exitReason?: string;
  relievingDate?: string;
  branchId?: number;
  managerId?: number;
  hrManagerId?: number;
  education?: EmployeeEducation[];
  experience?: EmployeeExperience[];
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
    startTime: string;
    endTime: string;
    days: number;
    leaveMinutes: number;
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
    startTime: string;
    endTime: string;
    reason: string;
}

export interface LeaveBalance {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  year: number;
  leaveType: Exclude<LeaveType, "UNPAID">;
  allocatedMinutes: number;
  carriedForwardMinutes: number;
  creditedMinutes: number;
  approvedMinutes: number;
  pendingMinutes: number;
  availableMinutes: number;
}

export interface LeaveBalanceAllocationPayload {
  leaveType: Exclude<LeaveType, "UNPAID">;
  allocatedMinutes: number;
  carriedForwardMinutes: number;
}

export interface LeaveBalanceUpdatePayload {
  year: number;
  balances: LeaveBalanceAllocationPayload[];
}

export interface CompanySettings {
  id: number;
  companyName: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  website?: string;
  registrationNumber?: string;
  gstin?: string;
  panNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  address?: string;
  currency: string;
  timezone: string;
  payrollCutoffDay: number;
  payrollFrequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  payrollDisbursementDay: number;
  weekStartDay: WeekDayName;
  updatedAt: string;
}
export interface AttendanceSettings { id?: number; attendanceMode: AttendanceMode; biometricEnabled: boolean; biometricName?: string; biometricUrl?: string; biometricApiKey?: string; updatedAt?: string; }
export interface AttendanceRecord { id: number; employeeId: number; employeeCode: string; employeeName: string; date: string; clockInDate?: string; clockIn?: string; clockOutDate?: string; clockOut?: string; source: string; }
export interface MissingPunchRequest {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  punchDate: string;
  punchTime: string;
  punchType: MissingPunchType;
  remark: string;
  status: MissingPunchStatus;
  reviewerEmail?: string;
  reviewerComment?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MissingPunchPayload {
  punchDate: string;
  punchTime: string;
  punchType: MissingPunchType;
  remark: string;
}

export interface DashboardSummary {
  totalEmployees: number;
  activeEmployees: number;
  presentEmployees: number;
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
  employmentType?: string;
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

export interface EmployeeHierarchyNode {
  id: number;
  employeeCode: string;
  fullName: string;
  designationTitle: string;
  departmentName: string;
  branchName?: string;
  managerId?: number;
  managerEmployeeCode?: string;
  managerName?: string;
  directReportsCount: number;
  hasProfilePhoto: boolean;
  children: EmployeeHierarchyNode[];
}

export interface EmployeeHierarchy {
  current: EmployeeHierarchyNode;
  ancestors: EmployeeHierarchyNode[];
  descendants: EmployeeHierarchyNode[];
}
