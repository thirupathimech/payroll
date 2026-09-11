export type RoleName = "ADMIN" | "HR" | "MANAGER" | "LEAD" | "EMPLOYEE";
export type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "PROBATION" | "RESIGNED" | "TERMINATED";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type MissingPunchStatus = "PENDING" | "APPROVED" | "REJECTED";
export type MissingPunchType = "IN" | "OUT";
export type OvertimeStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED" | "CANCELLED";
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
export type SalaryComponentCategory = "EARNING" | "EMPLOYER_CONTRIBUTION" | "DEDUCTION" | "REIMBURSEMENT";
export type SalaryValueType = "PERCENTAGE" | "FIXED";
export type SalaryUpdateMode = "ADJUST_CURRENT" | "CREATE_REVISION";
export type PayrollRunStatus = "DRAFT" | "APPROVED" | "LOCKED";

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
  activeEffectiveDate?: string;
  revisions: EmployeeSalaryRevision[];
}

export interface EmployeeSalaryRevision {
  id: number;
  effectiveDate: string;
  ctc: number;
  reason?: string;
  createdBy: string;
  createdAt: string;
  components: EmployeeSalaryComponent[];
}

export interface EmployeeSalaryPayload {
  ctc: number;
  updateMode: SalaryUpdateMode;
  effectiveDate?: string;
  reason?: string;
  components: Array<{
    componentId: number;
    valueType: SalaryValueType;
    value: number;
    enabled: boolean;
  }>;
}

export interface PayrollComponentLine {
  name: string;
  code: string;
  category: SalaryComponentCategory;
  amount: number;
}

export interface PayrollEntry {
  id: number;
  payrollRunId: number;
  periodYear: number;
  periodMonth: number;
  employeeCode: string;
  employeeName: string;
  departmentName?: string;
  designationTitle?: string;
  bankAccountNumber?: string;
  annualCtc: number;
  periodDays: number;
  eligibleDays: number;
  workingDays: number;
  attendanceDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  payableDays: number;
  grossEarnings: number;
  totalDeductions: number;
  employerContributions: number;
  reimbursementAmount: number;
  netPay: number;
  componentLines: PayrollComponentLine[];
  createdAt: string;
}

export interface PayrollRun {
  id: number;
  periodYear: number;
  periodMonth: number;
  periodStart: string;
  periodEnd: string;
  payrollFrequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  disbursementDate?: string;
  status: PayrollRunStatus;
  employeeCount: number;
  grossEarnings: number;
  totalDeductions: number;
  employerContributions: number;
  netPay: number;
  approvedBy?: string;
  approvedAt?: string;
  lockedBy?: string;
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
  entries: PayrollEntry[];
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
  logoDataUrl?: string;
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

export interface OvertimeRequest {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  overtimeDate: string;
  requestedMinutes: number;
  punchOvertimeMinutes: number;
  eligibleMinutes: number;
  approvedMinutes?: number;
  reason?: string;
  status: OvertimeStatus;
  requestedByEmail: string;
  reviewerEmail?: string;
  reviewerComment?: string;
  reviewedAt?: string;
  payrollRunId?: number;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OvertimePayload {
  employeeId?: number;
  overtimeDate: string;
  requestedMinutes: number;
  reason?: string;
}

export type OvertimePayRateType = "FIXED_HOURLY_AMOUNT" | "SALARY_HOURLY_MULTIPLIER";

export interface OvertimePolicy {
  id: number;
  branchId: number;
  branchName: string;
  departmentId: number;
  departmentName: string;
  designationId: number;
  designationTitle: string;
  payRateType: OvertimePayRateType;
  payRateValue: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OvertimePolicyPayload {
  branchId: number;
  departmentId: number;
  designationId: number;
  payRateType: OvertimePayRateType;
  payRateValue: number;
}

export interface OvertimeEligibility {
  eligible: boolean;
  payRateType?: OvertimePayRateType;
  payRateValue?: number;
}

export type EmployeeTransferStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export interface EmployeeTransferRequest {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  fromBranchId: number;
  fromBranchName: string;
  toBranchId: number;
  toBranchName: string;
  effectiveDate: string;
  reason: string;
  status: EmployeeTransferStatus;
  requestedByEmail: string;
  reviewerEmail?: string;
  reviewerComment?: string;
  reviewedAt?: string;
  appliedAt?: string;
  createdAt: string;
  updatedAt: string;
}
export interface EmployeeTransferPayload {
  employeeId?: number;
  toBranchId: number;
  effectiveDate: string;
  reason: string;
}

export type ResignationStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export interface ResignationRequest {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  resignationDate: string;
  proposedLastWorkingDate: string;
  approvedLastWorkingDate?: string;
  relievingDate?: string;
  reason: string;
  status: ResignationStatus;
  requestedByEmail: string;
  reviewerEmail?: string;
  reviewerComment?: string;
  reviewedAt?: string;
  separatedAt?: string;
  assetClearanceCompletedAt?: string;
  assetClearanceCompletedBy?: string;
  createdAt: string;
  updatedAt: string;
}
export interface ResignationPayload {
  employeeId?: number;
  proposedLastWorkingDate: string;
  reason: string;
}

export type AssetReturnStatus = "PENDING" | "RETURNED" | "NOT_RETURNED" | "NOT_REQUIRED";

export interface AssetCatalogItem {
  id: number;
  name: string;
  category?: string;
  returnable: boolean;
  defaultRecoveryAmount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssetCatalogItemPayload {
  name: string;
  category?: string;
  returnable: boolean;
  defaultRecoveryAmount: number;
  active: boolean;
}

export interface AssetRelease {
  id: number;
  catalogItemId: number;
  assetName: string;
  assetCategory?: string;
  returnable: boolean;
  releasedOn: string;
  returnStatus: AssetReturnStatus;
  returnedOn?: string;
  recoveryAmount: number;
  conditionNote?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinalSettlement {
  id: number;
  leaveEncashmentDays: number;
  leaveEncashmentAmount: number;
  noticePayRecovery: number;
  otherEarnings: number;
  otherDeductions: number;
  remarks?: string;
  settled: boolean;
  settledOn?: string;
  settledBy?: string;
  settledAt?: string;
  updatedAt?: string;
}

export interface FinalSettlementPayload {
  leaveEncashmentDays: number;
  leaveEncashmentAmount: number;
  noticePayRecovery: number;
  otherEarnings: number;
  otherDeductions: number;
  remarks?: string;
  settled: boolean;
  settledOn?: string;
}

export interface AssetClearanceSummary {
  totalAssets: number;
  returnedAssets: number;
  pendingAssets: number;
  recoveredAssets: number;
  assetRecoveryAmount: number;
  readyToComplete: boolean;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface ExitEmployee {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  joiningDate: string;
  branchName?: string;
  departmentName: string;
  designationTitle: string;
}

export interface ExitFinancialSummary {
  finalPayslipNetPay: number;
  leaveEncashmentAmount: number;
  otherEarnings: number;
  totalCredits: number;
  noticePayRecovery: number;
  assetRecoveryAmount: number;
  otherDeductions: number;
  totalDeductions: number;
  netSettlementPayable: number;
}

export interface ExitClearance {
  resignation: ResignationRequest;
  employee: ExitEmployee;
  assetReleases: AssetRelease[];
  clearance: AssetClearanceSummary;
  settlement: FinalSettlement;
  finalPayslip?: PayrollEntry;
  financialSummary: ExitFinancialSummary;
  noDuesEligible: boolean;
}

export type ReimbursementStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "PAID";
export interface ReimbursementAttachment {
  id: number;
  originalFileName: string;
  fileType: string;
  fileExtension: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  previewSupported: boolean;
}
export interface ReimbursementRequest {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  expenseDate: string;
  category: string;
  amount: number;
  description: string;
  status: ReimbursementStatus;
  requestedByEmail: string;
  reviewerEmail?: string;
  reviewerComment?: string;
  reviewedAt?: string;
  payrollRunId?: number;
  paidAt?: string;
  attachments: ReimbursementAttachment[];
  createdAt: string;
  updatedAt: string;
}
export interface ReimbursementPayload {
  employeeId?: number;
  expenseDate: string;
  category: string;
  amount: number;
  description: string;
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

export interface ShiftAssignmentUploadRowPayload {
  employeeCode: string;
  shiftCode: string;
  startDate: string;
  endDate: string;
}

export interface ShiftAssignmentBulkUploadPayload {
  overrideExisting: boolean;
  assignments: ShiftAssignmentUploadRowPayload[];
}

export interface ShiftAssignmentBulkUploadResponse {
  uploadedRows: number;
  savedAssignments: number;
  replacedAssignments: number;
  assignments: ShiftAssignment[];
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
