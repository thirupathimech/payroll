import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BriefcaseBusiness, Download, Edit3, Eye, FileSpreadsheet, GitBranch, GraduationCap, Plus, Save, Search, Trash2, UploadCloud, UserRound, type LucideIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { branchApi, departmentApi, designationApi, employeeApi, employeeSettingsApi } from "../api/payroll";
import { useAuth } from "../auth/AuthContext";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type Column } from "../components/ui/DataTable";
import { EmployeeAutocomplete } from "../components/ui/EmployeeAutocomplete";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { Select } from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import { formatDate } from "../lib/format";
import { useDebounce } from "../hooks/useDebounce";
import { ADMIN_ROLES, HR_ROLES, MANAGEMENT_ROLES, hasRoleAccess } from "../lib/access";
import type {
  Branch,
  Department,
  Designation,
  Employee,
  EmployeeDocument as EmployeeDocumentMeta,
  EmployeeSettings,
  EmployeePayload,
  EmploymentStatus,
  EmployeeHierarchy,
  EmployeeHierarchyNode,
  PageResponse,
} from "../types";

interface AddressFields {
  line1: string;
  line2: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pinCode: string;
}

interface EmployeeDocumentForm {
  id: number;
  type: string;
  fileName: string;
  file?: File;
  previewUrl: string;
  persistedId?: number;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
  uploadedBy?: string;
  previewSupported?: boolean;
  uploadProgress?: number;
}

interface EducationRecord {
  id: number;
  qualification: string;
  institution: string;
  university: string;
  yearOfPassing: string;
  score: string;
  specialization: string;
}

interface ExperienceRecord {
  id: number;
  company: string;
  designation: string;
  startDate: string;
  endDate: string;
  totalExperience: string;
  lastDrawnSalary: string;
  reasonForLeaving: string;
}

type EmployeeForm = {
  employeeCode: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  maritalStatus: string;
  bloodGroup: string;
  nationality: string;
  aadhaarNumber: string;
  panNumber: string;
  mobileNumber: string;
  alternateMobileNumber: string;
  personalEmail: string;
  officialEmail: string;
  profilePhotoFile?: File;
  profilePhotoPreviewUrl: string;
  hasExistingProfilePhoto: boolean;
  deleteProfilePhoto: boolean;
  employmentType: string;
  departmentId: number;
  designationId: number;
  branchId: number;
  reportingManager: string;
  hrManager: string;
  joiningDate: string;
  confirmationDate: string;
  probationPeriod: string;
  status: EmploymentStatus;
  biometricId: string;
  baseSalary: string;
  currentAddress: AddressFields;
  sameAsCurrentAddress: boolean;
  permanentAddress: AddressFields;
  emergencyContactName: string;
  emergencyRelationship: string;
  emergencyMobileNumber: string;
  accountHolderName: string;
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
  documents: EmployeeDocumentForm[];
  education: EducationRecord[];
  experience: ExperienceRecord[];
  primarySkill: string;
  secondarySkill: string;
  certifications: string;
  languagesKnown: string;
  resignationDate: string;
  lastWorkingDate: string;
  exitReason: string;
  relievingDate: string;
};

type ProfilePanel = "profile" | "hierarchy" | "education" | "experience";

const emptyPage: PageResponse<Employee> = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  last: true,
};

const emptyAddress: AddressFields = {
  line1: "",
  line2: "",
  city: "",
  district: "",
  state: "",
  country: "",
  pinCode: "",
};

const initialSettings: EmployeeSettings = {
  id: 0,
  codeMode: "MANUAL",
  prefix: "EMP",
  suffix: "",
  startingNumber: 1,
  padding: 4,
  updatedAt: "",
};

const initialForm: EmployeeForm = {
  employeeCode: "",
  firstName: "",
  middleName: "",
  lastName: "",
  gender: "",
  dateOfBirth: "",
  maritalStatus: "",
  bloodGroup: "",
  nationality: "Indian",
  aadhaarNumber: "",
  panNumber: "",
  mobileNumber: "",
  alternateMobileNumber: "",
  personalEmail: "",
  officialEmail: "",
  profilePhotoPreviewUrl: "",
  hasExistingProfilePhoto: false,
  deleteProfilePhoto: false,
  employmentType: "Permanent",
  departmentId: 0,
  designationId: 0,
  branchId: 0,
  reportingManager: "",
  hrManager: "",
  joiningDate: new Date().toISOString().slice(0, 10),
  confirmationDate: "",
  probationPeriod: "",
  status: "ACTIVE",
  biometricId: "",
  baseSalary: "",
  currentAddress: emptyAddress,
  sameAsCurrentAddress: false,
  permanentAddress: emptyAddress,
  emergencyContactName: "",
  emergencyRelationship: "",
  emergencyMobileNumber: "",
  accountHolderName: "",
  bankName: "",
  bankAccountNumber: "",
  ifscCode: "",
  documents: [],
  education: [],
  experience: [],
  primarySkill: "",
  secondarySkill: "",
  certifications: "",
  languagesKnown: "",
  resignationDate: "",
  lastWorkingDate: "",
  exitReason: "",
  relievingDate: "",
};

const statuses: EmploymentStatus[] = ["ACTIVE", "ON_LEAVE", "PROBATION", "TERMINATED"];
const employmentTypes = ["Permanent", "Contract", "Intern", "Trainee", "Consultant"];
const genders = ["Male", "Female", "Non-Binary", "Prefer Not To Say"];
const maritalStatuses = ["Single", "Married", "Divorced", "Widowed"];
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const documentTypes = [
  "Aadhaar",
  "PAN",
  "Passport",
  "Driving License",
  "Resume",
  "Offer Letter",
  "Appointment Letter",
  "Experience Certificate",
  "Education Certificate",
  "Employee Photo",
  "Bank Passbook",
  "Cancelled Cheque",
  "Other Documents",
];

type EmployeeUploadColumnKey =
  | "employeeCode"
  | "firstName"
  | "lastName"
  | "gender"
  | "dateOfBirth"
  | "maritalStatus"
  | "bloodGroup"
  | "nationality"
  | "aadhaarNumber"
  | "taxIdentificationNumber"
  | "phone"
  | "alternateMobileNumber"
  | "personalEmail"
  | "email"
  | "joiningDate"
  | "employmentType"
  | "confirmationDate"
  | "biometricId"
  | "department"
  | "designation"
  | "reportingManager"
  | "status";

interface EmployeeUploadColumn {
  key: EmployeeUploadColumnKey;
  header: string;
  width: number;
}

interface EmployeeUploadRow {
  id: number;
  line: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  joiningDate: string;
  department: string;
  designation: string;
  reportingManager: string;
  status: string;
  errors: string[];
  payload?: EmployeePayload;
}

const employeeUploadBaseColumns: EmployeeUploadColumn[] = [
  { key: "firstName", header: "First Name *", width: 22 },
  { key: "lastName", header: "Last Name *", width: 22 },
  { key: "gender", header: "Gender", width: 18 },
  { key: "dateOfBirth", header: "Date of Birth", width: 18 },
  { key: "maritalStatus", header: "Marital Status", width: 20 },
  { key: "bloodGroup", header: "Blood Group", width: 16 },
  { key: "nationality", header: "Nationality", width: 20 },
  { key: "aadhaarNumber", header: "Aadhaar Number", width: 22 },
  { key: "taxIdentificationNumber", header: "PAN Number", width: 18 },
  { key: "phone", header: "Mobile Number", width: 20 },
  { key: "alternateMobileNumber", header: "Alternate Mobile Number", width: 25 },
  { key: "personalEmail", header: "Personal Email", width: 32 },
  { key: "email", header: "Official Email *", width: 32 },
  { key: "joiningDate", header: "Joining Date *", width: 18 },
  { key: "employmentType", header: "Employment Type", width: 20 },
  { key: "confirmationDate", header: "Confirmation Date", width: 20 },
  { key: "biometricId", header: "Biometric ID", width: 20 },
  { key: "department", header: "Department *", width: 26 },
  { key: "designation", header: "Designation *", width: 34 },
  { key: "reportingManager", header: "Reporting Manager", width: 36 },
  { key: "status", header: "Status *", width: 18 },
];

function employeeUploadColumns(requiresEmployeeCode: boolean): EmployeeUploadColumn[] {
  return requiresEmployeeCode
    ? [{ key: "employeeCode", header: "Employee Code *", width: 20 }, ...employeeUploadBaseColumns]
    : employeeUploadBaseColumns;
}

function normalizedUploadHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function employeeUploadHeaderKey(value: string): EmployeeUploadColumnKey | undefined {
  const normalized = normalizedUploadHeader(value);
  return ({
    employeecode: "employeeCode",
    firstname: "firstName",
    lastname: "lastName",
    gender: "gender",
    dateofbirth: "dateOfBirth",
    dob: "dateOfBirth",
    maritalstatus: "maritalStatus",
    bloodgroup: "bloodGroup",
    nationality: "nationality",
    aadhaarnumber: "aadhaarNumber",
    aadhaar: "aadhaarNumber",
    pannumber: "taxIdentificationNumber",
    pan: "taxIdentificationNumber",
    mobilenumber: "phone",
    mobile: "phone",
    phone: "phone",
    alternatemobilenumber: "alternateMobileNumber",
    alternativemobilenumber: "alternateMobileNumber",
    personalemail: "personalEmail",
    officialemail: "email",
    joiningdate: "joiningDate",
    employmenttype: "employmentType",
    confirmationdate: "confirmationDate",
    biometricid: "biometricId",
    department: "department",
    designation: "designation",
    reportingmanager: "reportingManager",
    status: "status",
  } as Record<string, EmployeeUploadColumnKey | undefined>)[normalized];
}

function excelUploadCellText(value: unknown, dateOnly = false) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "object" && value && "result" in value) {
    return excelUploadCellText((value as { result: unknown }).result, dateOnly);
  }
  if (typeof value === "object" && value && "text" in value) {
    return String((value as { text: unknown }).text ?? "").trim();
  }
  if (typeof value === "object" && value && "hyperlink" in value) {
    return String((value as { hyperlink: unknown }).hyperlink ?? "").replace(/^mailto:/i, "").trim();
  }
  if (typeof value === "object" && value && "richText" in value) {
    return (value as { richText: Array<{ text?: string }> }).richText.map((part) => part.text ?? "").join("").trim();
  }
  if (dateOnly && typeof value === "number") {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }
  return String(value).trim();
}

function isValidUploadDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  const localValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return !Number.isNaN(date.getTime()) && localValue === value;
}

function designationUploadLabel(designation: Designation) {
  return `${designation.title} — ${designation.departmentName}`;
}

function reportingManagerUploadLabel(employee: Employee) {
  return `${employee.employeeCode} — ${employee.fullName}`;
}

function normalizeUploadValue(value: string) {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

function calculateExperience(startDate: string, endDate: string) {
  if (!startDate || !endDate || endDate < startDate) {
    return "";
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) {
    months -= 1;
  }

  const years = Math.floor(Math.max(0, months) / 12);
  const remainingMonths = Math.max(0, months) % 12;
  return `${years}y ${remainingMonths}m`;
}

function addressToText(address: AddressFields) {
  return [address.line1, address.line2, address.city, address.district, address.state, address.country, address.pinCode]
    .filter(Boolean)
    .join(", ");
}

function textToAddress(text?: string | null): AddressFields {
  const [line1 = "", line2 = "", city = "", district = "", state = "", country = "", pinCode = ""] = (text ?? "")
    .split(",")
    .map((part) => part.trim());
  return { line1, line2, city, district, state, country, pinCode };
}

function readEmployeeAddress(employee: Employee): AddressFields {
  return textToAddress(employee.address);
}

function readEmployeePermanentAddress(employee: Employee): AddressFields {
  return textToAddress(employee.permanentAddress ?? employee.address);
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateMobile(value: string) {
  return /^[6-9]\d{9}$/.test(value);
}

function validateAadhaar(value: string) {
  return /^\d{12}$/.test(value);
}

function validatePan(value: string) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.toUpperCase());
}

function validateIfsc(value: string) {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase());
}

function formatFileSize(bytes = 0) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function supportsInlinePreview(fileType?: string) {
  return Boolean(fileType && (fileType.startsWith("image/") || fileType === "application/pdf"));
}

function documentMetaToForm(document: EmployeeDocumentMeta): EmployeeDocumentForm {
  return {
    id: document.id,
    persistedId: document.id,
    type: document.documentCategory,
    fileName: document.originalFileName,
    previewUrl: "",
    fileType: document.fileType,
    fileSize: document.fileSize,
    uploadedAt: document.uploadedAt,
    uploadedBy: document.uploadedBy,
    previewSupported: document.previewSupported,
    uploadProgress: 100,
  };
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="rounded-3xl border border-moss/10 bg-white/70 p-4" open={defaultOpen}>
      <summary className="cursor-pointer select-none font-display text-lg font-extrabold text-ink">{title}</summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}

function ProfileMenuButton({
  icon: Icon,
  active,
  label,
  onClick,
}: {
  icon: LucideIcon;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
        active ? "bg-moss text-white shadow-glow" : "bg-white/80 text-ink hover:bg-white"
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function orgNodeTone(depth: number) {
  return [
    "bg-[#d93636] text-white",
    "bg-[#4c7ec1] text-white",
    "bg-[#8bc43f] text-white",
    "bg-[#d6df18] text-[#33431d]",
  ][Math.min(depth, 3)];
}

function OrgChartNode({ node, depth = 0 }: { node: EmployeeHierarchyNode; depth?: number }) {
  return (
    <div className="flex min-w-max flex-col items-center">
      <div className={`relative z-10 w-40 rounded-xl px-4 py-3 text-center shadow-sm ${orgNodeTone(depth)}`}>
        <p className="truncate text-sm font-extrabold">{node.fullName}</p>
        <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">{node.designationTitle}</p>
        <p className="mt-1 truncate text-[10px] font-semibold opacity-70">{node.employeeCode}</p>
      </div>
      {node.children.length > 0 && (
        <div className="relative mt-12 flex items-start justify-center gap-6 before:absolute before:left-1/2 before:top-[-24px] before:h-6 before:w-px before:bg-ink/25">
          {node.children.map((child) => (
            <div key={child.employeeCode} className="relative pt-0 before:absolute before:left-1/2 before:top-[-24px] before:h-6 before:w-px before:bg-ink/25 after:absolute after:left-1/2 after:top-[-24px] after:h-px after:w-[calc(100%+1.5rem)] after:-translate-x-1/2 after:bg-ink/25 first:after:left-1/2 last:after:w-1/2">
              <OrgChartNode node={child} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HierarchyChart({ hierarchy }: { hierarchy: EmployeeHierarchy }) {
  const chain = [...hierarchy.ancestors, hierarchy.current];
  let chartRoot: EmployeeHierarchyNode = { ...hierarchy.current, children: hierarchy.descendants };
  for (let index = chain.length - 2; index >= 0; index -= 1) {
    chartRoot = { ...chain[index], children: [chartRoot] };
  }

  return (
    <div className="rounded-[2rem] border border-moss/10 bg-white/75 p-5 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Hierarchy Chart</p>
          <h4 className="mt-2 font-display text-xl font-extrabold text-ink">Organization structure</h4>
        </div>
        <p className="text-sm font-semibold text-ink/45">{hierarchy.current.directReportsCount} direct report(s)</p>
      </div>
      <div className="mt-8 overflow-x-auto pb-4">
        <div className="flex min-w-max justify-center px-8 py-2">
          <OrgChartNode node={chartRoot} />
        </div>
      </div>
    </div>
  );
}

export function EmployeesPage() {
  const { user, viewMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState(emptyPage);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(initialForm);
  const [settings, setSettings] = useState<EmployeeSettings>(initialSettings);
  const [error, setError] = useState("");
  const [pageError, setPageError] = useState("");
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});
  const [fileMessage, setFileMessage] = useState("");
  const [hierarchy, setHierarchy] = useState<EmployeeHierarchy | null>(null);
  const [profilePanel, setProfilePanel] = useState<ProfilePanel>("profile");
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [viewProfilePhotoUrl, setViewProfilePhotoUrl] = useState("");
  const [employeeUploadFile, setEmployeeUploadFile] = useState<File>();
  const [employeeUploadRows, setEmployeeUploadRows] = useState<EmployeeUploadRow[]>([]);
  const [validatingEmployeeUpload, setValidatingEmployeeUpload] = useState(false);
  const [savingEmployeeUpload, setSavingEmployeeUpload] = useState(false);
  const [employeeUploadError, setEmployeeUploadError] = useState("");
  const [employeeUploadMessage, setEmployeeUploadMessage] = useState("");
  const errorAlertRef = useRef<HTMLDivElement>(null);
  const employeeUploadInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search);

  const isPersonnelMode = viewMode === "personnel";
  const currentEmployee = employees.content[0];
  const requestedEmployeeIdValue = Number(searchParams.get("employeeId"));
  const requestedEmployeeId = Number.isSafeInteger(requestedEmployeeIdValue) && requestedEmployeeIdValue > 0 ? requestedEmployeeIdValue : null;

  const loadEmployeeDirectory = useCallback(() => {
    if (isPersonnelMode) {
      employeeApi.me().then((employee) => setAllEmployees([employee]));
      return;
    }
    employeeApi.search({ page: 0, size: 1000 }).then((employeePage) => setAllEmployees(employeePage.content));
  }, [isPersonnelMode]);

  useEffect(() => {
    Promise.all([
      branchApi.active(),
      departmentApi.active(),
      designationApi.search({ active: true, page: 0, size: 500 }),
      isPersonnelMode ? employeeApi.me().then((employee) => ({ ...emptyPage, content: [employee], totalElements: 1, totalPages: 1 })) : employeeApi.search({ page: 0, size: 1000 }),
      employeeSettingsApi.get(),
    ]).then(([branchItems, departmentItems, designationPage, employeePage, employeeSettings]) => {
      setBranches(branchItems);
      setDepartments(departmentItems);
      setDesignations(designationPage.content);
      setAllEmployees(employeePage.content);
      setSettings(employeeSettings);
      const departmentId = departmentItems[0]?.id || 0;
      const designationId =
        designationPage.content.find((designation) => designation.departmentId === departmentId)?.id ||
        designationPage.content[0]?.id ||
        0;
      setForm((current) => ({ ...current, departmentId, designationId, branchId: branchItems[0]?.id || 0 }));
    });
  }, [isPersonnelMode]);

  useEffect(() => {
    if (!isPersonnelMode) {
      setHierarchy(null);
      return;
    }

    employeeApi.hierarchy().then(setHierarchy).catch(() => setHierarchy(null));
  }, [isPersonnelMode]);

  useEffect(() => {
    if (!isPersonnelMode) {
      setProfilePanel("profile");
    }
  }, [isPersonnelMode]);

  const loadEmployees = useCallback(() => {
    setLoading(true);
    if (isPersonnelMode) {
      employeeApi
        .me()
        .then((employee) => setEmployees({ ...emptyPage, content: [employee], totalElements: 1, totalPages: 1 }))
        .finally(() => setLoading(false));
      return;
    }
    employeeApi
      .search({
        search: debouncedSearch,
        status: statusFilter ? (statusFilter as EmploymentStatus) : undefined,
        departmentId: departmentFilter ? Number(departmentFilter) : undefined,
        page,
        size: 10,
      })
      .then(setEmployees)
      .finally(() => setLoading(false));
  }, [debouncedSearch, departmentFilter, isPersonnelMode, page, statusFilter]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    const employeesWithPhotos = employees.content.filter((employee) => employee.hasProfilePhoto && !thumbnailUrls[employee.id]);
    if (employeesWithPhotos.length === 0) {
      return;
    }

    let cancelled = false;
    Promise.all(
      employeesWithPhotos.map((employee) =>
        employeeApi
          .getProfilePhoto(employee.id)
          .then((blob) => [employee.id, URL.createObjectURL(blob)] as const)
          .catch(() => [employee.id, ""] as const),
      ),
    ).then((items) => {
      if (cancelled) {
        return;
      }
      setThumbnailUrls((current) => ({
        ...current,
        ...Object.fromEntries(items.filter(([, url]) => url)),
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [employees.content, thumbnailUrls]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";

    if (!viewingEmployee?.hasProfilePhoto) {
      setViewProfilePhotoUrl("");
      return () => undefined;
    }

    setViewProfilePhotoUrl("");
    employeeApi
      .getProfilePhoto(viewingEmployee.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setViewProfilePhotoUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setViewProfilePhotoUrl("");
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [viewingEmployee?.hasProfilePhoto, viewingEmployee?.id]);

  const filteredDesignations = useMemo(
    () => designations.filter((designation) => designation.departmentId === form.departmentId),
    [designations, form.departmentId],
  );
  const departmentOptions = useMemo(
    () => departments.map((department) => ({ value: String(department.id), label: department.name, searchText: department.code })),
    [departments],
  );
  const designationOptions = useMemo(
    () =>
      filteredDesignations.map((designation) => ({
        value: String(designation.id),
        label: designation.title,
        searchText: `${designation.code} ${designation.departmentName}`,
      })),
    [filteredDesignations],
  );
  const employmentTypeOptions = useMemo(
    () => employmentTypes.map((type) => ({ value: type, label: type })),
    [],
  );
  const statusOptions = useMemo(
    () => statuses.map((status) => ({ value: status, label: status })),
    [],
  );
  const branchOptions = useMemo(
    () => branches.map((branch) => ({ value: String(branch.id), label: branch.name, searchText: branch.code ?? "" })),
    [branches],
  );

  const canManageEmployees = hasRoleAccess(user, HR_ROLES) && !isPersonnelMode;
  const canEditEmployees = hasRoleAccess(user, MANAGEMENT_ROLES) && !isPersonnelMode;
  const canEditProfile = canEditEmployees || isPersonnelMode;
  const canTerminateEmployees = hasRoleAccess(user, ADMIN_ROLES);

  function codeExists(code: string) {
    return allEmployees.some(
      (employee) => employee.employeeCode.toLowerCase() === code.trim().toLowerCase() && employee.id !== editing?.id,
    );
  }

  function showFormError(message: string) {
    setError(message);
    window.setTimeout(() => {
      const modalScrollContainer = errorAlertRef.current?.closest("[data-modal-scroll='true']");
      if (modalScrollContainer instanceof HTMLElement) {
        modalScrollContainer.scrollTo({ top: 0, behavior: "smooth" });
      }
      errorAlertRef.current?.focus({ preventScroll: true });
    }, 0);
  }

  function createInitialForm(departmentId: number, designationId: number, branchId: number): EmployeeForm {
    return {
      ...initialForm,
      employeeCode: "",
      departmentId,
      designationId,
      branchId,
    };
  }

  function openCreate() {
    const departmentId = departments[0]?.id || 0;
    const designationId =
      designations.find((designation) => designation.departmentId === departmentId)?.id || designations[0]?.id || 0;
    const branchId = branches[0]?.id || 0;
    setEditing(null);
    setForm(createInitialForm(departmentId, designationId, branchId));
    setError("");
    setFileMessage("");
    setModalOpen(true);
  }

  const openEdit = useCallback(async (employee: Employee) => {
    setEditing(employee);
    const currentAddress = readEmployeeAddress(employee);
    const permanentAddress = readEmployeePermanentAddress(employee);
    setForm({
      ...initialForm,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      middleName: employee.middleName ?? "",
      lastName: employee.lastName,
      officialEmail: employee.email,
      personalEmail: employee.personalEmail ?? "",
      mobileNumber: employee.phone ?? "",
      alternateMobileNumber: employee.alternateMobileNumber ?? "",
      gender: employee.gender ?? "",
      maritalStatus: employee.maritalStatus ?? "",
      bloodGroup: employee.bloodGroup ?? "",
      nationality: employee.nationality ?? "Indian",
      aadhaarNumber: employee.aadhaarNumber ?? "",
      dateOfBirth: employee.dateOfBirth ?? "",
      joiningDate: employee.joiningDate,
      confirmationDate: employee.confirmationDate ?? "",
      baseSalary: String(employee.baseSalary),
      employmentType: employee.employmentType ?? "Permanent",
      probationPeriod: employee.probationPeriod ?? "",
      biometricId: employee.biometricId ?? "",
      bankAccountNumber: employee.bankAccountNumber ?? "",
      accountHolderName: employee.accountHolderName ?? "",
      bankName: employee.bankName ?? "",
      ifscCode: employee.ifscCode ?? "",
      panNumber: employee.taxIdentificationNumber ?? "",
      currentAddress,
      permanentAddress,
      reportingManager: employee.managerEmployeeCode ?? "",
      hrManager: employee.hrManagerEmployeeCode ?? "",
      branchId: employee.branchId ?? branches[0]?.id ?? 0,
      profilePhotoPreviewUrl: "",
      hasExistingProfilePhoto: employee.hasProfilePhoto,
      deleteProfilePhoto: false,
      status: employee.status,
      departmentId: employee.departmentId,
      designationId: employee.designationId,
      emergencyContactName: employee.emergencyContactName ?? "",
      emergencyRelationship: employee.emergencyRelationship ?? "",
      emergencyMobileNumber: employee.emergencyMobileNumber ?? "",
      primarySkill: employee.primarySkill ?? "",
      secondarySkill: employee.secondarySkill ?? "",
      certifications: employee.certifications ?? "",
      languagesKnown: employee.languagesKnown ?? "",
      resignationDate: employee.resignationDate ?? "",
      lastWorkingDate: employee.lastWorkingDate ?? "",
      exitReason: employee.exitReason ?? "",
      relievingDate: employee.relievingDate ?? "",
      education: (employee.education ?? []).map((record) => ({
        id: record.id ?? Date.now(),
        qualification: record.qualification ?? "",
        institution: record.institution ?? "",
        university: record.university ?? "",
        yearOfPassing: record.yearOfPassing ?? "",
        score: record.score ?? "",
        specialization: record.specialization ?? "",
      })),
      experience: (employee.experience ?? []).map((record) => ({
        id: record.id ?? Date.now(),
        company: record.company ?? "",
        designation: record.designation ?? "",
        startDate: record.startDate ?? "",
        endDate: record.endDate ?? "",
        totalExperience: record.totalExperience ?? "",
        lastDrawnSalary: record.lastDrawnSalary ?? "",
        reasonForLeaving: record.reasonForLeaving ?? "",
      })),
    });
    setError("");
    setFileMessage("");
    setModalOpen(true);

    try {
      const [documents, profileBlob] = await Promise.all([
        employeeApi.documents(employee.id),
        employee.hasProfilePhoto ? employeeApi.getProfilePhoto(employee.id).catch(() => null) : Promise.resolve(null),
      ]);
      setForm((current) => ({
        ...current,
        documents: documents.map(documentMetaToForm),
        profilePhotoPreviewUrl: profileBlob ? URL.createObjectURL(profileBlob) : "",
        hasExistingProfilePhoto: Boolean(profileBlob),
      }));
    } catch (apiError) {
      setFileMessage(getErrorMessage(apiError));
    }
  }, [branches]);

  const openEmployeeView = useCallback((employee: Employee) => {
    setPageError("");
    setViewingEmployee(employee);
  }, []);

  useEffect(() => {
    if (!requestedEmployeeId) {
      return;
    }

    let cancelled = false;
    setPageError("");
    setViewingEmployee(null);
    employeeApi
      .get(requestedEmployeeId)
      .then((employee) => {
        if (!cancelled) {
          openEmployeeView(employee);
        }
      })
      .catch((apiError) => {
        if (!cancelled) {
          setPageError(getErrorMessage(apiError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.delete("employeeId");
            return next;
          }, { replace: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [openEmployeeView, requestedEmployeeId, setSearchParams]);

  function updateDepartment(departmentId: number) {
    const designationId =
      designations.find((designation) => designation.departmentId === departmentId)?.id || form.designationId;
    setForm({ ...form, departmentId, designationId });
  }

  function updateCurrentAddress(field: keyof AddressFields, value: string) {
    const currentAddress = { ...form.currentAddress, [field]: value };
    setForm({
      ...form,
      currentAddress,
      permanentAddress: form.sameAsCurrentAddress ? currentAddress : form.permanentAddress,
    });
  }

  function setSameAsCurrentAddress(checked: boolean) {
    setForm({
      ...form,
      sameAsCurrentAddress: checked,
      permanentAddress: checked ? form.currentAddress : form.permanentAddress,
    });
  }

  function addEducation() {
    setForm({
      ...form,
      education: [
        ...form.education,
        { id: Date.now(), qualification: "", institution: "", university: "", yearOfPassing: "", score: "", specialization: "" },
      ],
    });
  }

  function updateEducation(id: number, field: keyof EducationRecord, value: string) {
    setForm({
      ...form,
      education: form.education.map((record) => (record.id === id ? { ...record, [field]: value } : record)),
    });
  }

  function addExperience() {
    setForm({
      ...form,
      experience: [
        ...form.experience,
        {
          id: Date.now(),
          company: "",
          designation: "",
          startDate: "",
          endDate: "",
          totalExperience: "",
          lastDrawnSalary: "",
          reasonForLeaving: "",
        },
      ],
    });
  }

  function updateExperience(id: number, field: keyof ExperienceRecord, value: string) {
    setForm({
      ...form,
      experience: form.experience.map((record) => {
        if (record.id !== id) {
          return record;
        }
        const nextRecord = { ...record, [field]: value };
        if (field === "startDate" || field === "endDate") {
          nextRecord.totalExperience = calculateExperience(nextRecord.startDate, nextRecord.endDate);
        }
        return nextRecord;
      }),
    });
  }

  function addDocuments(files: FileList | null) {
    if (!files) {
      return;
    }

    const newDocuments = Array.from(files).map((file, index) => ({
      id: Date.now() + index,
      type: documentTypes[0],
      fileName: file.name,
      file,
      previewUrl: URL.createObjectURL(file),
      fileType: file.type,
      fileSize: file.size,
      previewSupported: supportsInlinePreview(file.type),
      uploadProgress: 0,
    }));

    setForm({ ...form, documents: [...form.documents, ...newDocuments] });
  }

  function updateProfilePhoto(file: File | undefined) {
    if (!file) {
      return;
    }
    setForm({
      ...form,
      profilePhotoFile: file,
      profilePhotoPreviewUrl: URL.createObjectURL(file),
      deleteProfilePhoto: false,
    });
  }

  async function deleteProfilePhoto() {
    if (editing && form.hasExistingProfilePhoto) {
      await employeeApi.deleteProfilePhoto(editing.id);
      setThumbnailUrls((current) => {
        const next = { ...current };
        delete next[editing.id];
        return next;
      });
    }
    setForm({
      ...form,
      profilePhotoFile: undefined,
      profilePhotoPreviewUrl: "",
      hasExistingProfilePhoto: false,
      deleteProfilePhoto: Boolean(editing),
    });
  }

  async function previewDocument(document: EmployeeDocumentForm) {
    if (!document.previewSupported && !supportsInlinePreview(document.fileType)) {
      return;
    }
    if (document.persistedId && editing) {
      const blob = await employeeApi.previewDocument(editing.id, document.persistedId);
      window.open(URL.createObjectURL(blob), "_blank");
      return;
    }
    if (document.previewUrl) {
      window.open(document.previewUrl, "_blank");
    }
  }

  async function downloadDocument(document: EmployeeDocumentForm) {
    if (document.persistedId && editing) {
      const blob = await employeeApi.downloadDocument(editing.id, document.persistedId);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (document.previewUrl) {
      const anchor = window.document.createElement("a");
      anchor.href = document.previewUrl;
      anchor.download = document.fileName;
      anchor.click();
    }
  }

  async function removeDocument(document: EmployeeDocumentForm) {
    if (document.persistedId && editing) {
      await employeeApi.deleteDocument(editing.id, document.persistedId);
    }
    setForm((current) => ({ ...current, documents: current.documents.filter((item) => item.id !== document.id) }));
  }

  function toPayload(): EmployeePayload {
    const managerId = allEmployees.find((employee) => employee.employeeCode === form.reportingManager)?.id;
    const hrManagerId = allEmployees.find((employee) => employee.employeeCode === form.hrManager)?.id;
    return {
      employeeCode: form.employeeCode.trim(),
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim() || undefined,
      lastName: form.lastName.trim(),
      email: form.officialEmail.trim(),
      personalEmail: form.personalEmail.trim() || undefined,
      phone: form.mobileNumber || undefined,
      alternateMobileNumber: form.alternateMobileNumber || undefined,
      gender: form.gender || undefined,
      maritalStatus: form.maritalStatus || undefined,
      bloodGroup: form.bloodGroup || undefined,
      nationality: form.nationality || undefined,
      aadhaarNumber: form.aadhaarNumber || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      joiningDate: form.joiningDate,
      confirmationDate: form.confirmationDate || undefined,
      baseSalary: Number(form.baseSalary),
      employmentType: form.employmentType || undefined,
      probationPeriod: form.probationPeriod || undefined,
      biometricId: form.biometricId || undefined,
      bankAccountNumber: form.bankAccountNumber || undefined,
      accountHolderName: form.accountHolderName || undefined,
      bankName: form.bankName || undefined,
      ifscCode: form.ifscCode || undefined,
      taxIdentificationNumber: form.panNumber || undefined,
      address: addressToText(form.currentAddress) || undefined,
      permanentAddress: addressToText(form.permanentAddress) || undefined,
      emergencyContactName: form.emergencyContactName || undefined,
      emergencyRelationship: form.emergencyRelationship || undefined,
      emergencyMobileNumber: form.emergencyMobileNumber || undefined,
      primarySkill: form.primarySkill || undefined,
      secondarySkill: form.secondarySkill || undefined,
      certifications: form.certifications || undefined,
      languagesKnown: form.languagesKnown || undefined,
      resignationDate: form.resignationDate || undefined,
      lastWorkingDate: form.lastWorkingDate || undefined,
      exitReason: form.exitReason || undefined,
      relievingDate: form.relievingDate || undefined,
      branchId: form.branchId || undefined,
      managerId,
      hrManagerId,
      education: form.education.map((record) => ({
        id: record.id,
        qualification: record.qualification || undefined,
        institution: record.institution || undefined,
        university: record.university || undefined,
        yearOfPassing: record.yearOfPassing || undefined,
        score: record.score || undefined,
        specialization: record.specialization || undefined,
      })),
      experience: form.experience.map((record) => ({
        id: record.id,
        company: record.company || undefined,
        designation: record.designation || undefined,
        startDate: record.startDate || undefined,
        endDate: record.endDate || undefined,
        totalExperience: record.totalExperience || undefined,
        lastDrawnSalary: record.lastDrawnSalary || undefined,
        reasonForLeaving: record.reasonForLeaving || undefined,
      })),
      status: form.status,
      departmentId: form.departmentId,
      designationId: form.designationId,
    };
  }

  async function downloadEmployeeUploadTemplate() {
    setEmployeeUploadError("");
    setEmployeeUploadMessage("");
    try {
      const [latestSettings, activeDepartments, activeDesignationPage, employeePage] = await Promise.all([
        employeeSettingsApi.get(),
        departmentApi.active(),
        designationApi.search({ active: true, page: 0, size: 500 }),
        employeeApi.search({ page: 0, size: 1000 }),
      ]);
      if (!activeDepartments.length || !activeDesignationPage.content.length) {
        setEmployeeUploadError("Add at least one active department and designation before downloading the employee template.");
        return;
      }
      setSettings(latestSettings);
      setDepartments(activeDepartments);
      setDesignations(activeDesignationPage.content);
      setAllEmployees(employeePage.content);

      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const requiresEmployeeCode = latestSettings.codeMode === "MANUAL";
      const templateColumns = employeeUploadColumns(requiresEmployeeCode);
      const sheet = workbook.addWorksheet("Employee Upload");
      const dropdownValues = workbook.addWorksheet("Dropdown Values");
      const templateRows = 250;

      sheet.columns = templateColumns.map((column) => ({ header: column.header, key: column.key, width: column.width }));
      for (let index = 0; index < templateRows; index += 1) {
        sheet.addRow(Object.fromEntries(templateColumns.map((column) => [column.key, ""])));
      }

      const orderedDepartments = [...activeDepartments].sort((left, right) => left.name.localeCompare(right.name));
      const orderedDesignations = [...activeDesignationPage.content].sort((left, right) => designationUploadLabel(left).localeCompare(designationUploadLabel(right)));
      const reportingManagers = employeePage.content
        .filter((employee) => employee.status !== "TERMINATED")
        .sort((left, right) => reportingManagerUploadLabel(left).localeCompare(reportingManagerUploadLabel(right)));
      dropdownValues.columns = [
        { header: "Department", key: "department", width: 30 },
        { header: "Designation", key: "designation", width: 38 },
        { header: "Reporting Manager", key: "reportingManager", width: 38 },
        { header: "Status", key: "status", width: 18 },
        { header: "Gender", key: "gender", width: 22 },
        { header: "Marital Status", key: "maritalStatus", width: 22 },
        { header: "Blood Group", key: "bloodGroup", width: 18 },
        { header: "Employment Type", key: "employmentType", width: 22 },
      ];
      const dropdownRowCount = Math.max(
        orderedDepartments.length,
        orderedDesignations.length,
        reportingManagers.length,
        statuses.length,
        genders.length,
        maritalStatuses.length,
        bloodGroups.length,
        employmentTypes.length,
        1,
      );
      for (let index = 0; index < dropdownRowCount; index += 1) {
        dropdownValues.addRow({
          department: orderedDepartments[index]?.name ?? "",
          designation: orderedDesignations[index] ? designationUploadLabel(orderedDesignations[index]) : "",
          reportingManager: reportingManagers[index] ? reportingManagerUploadLabel(reportingManagers[index]) : "",
          status: statuses[index] ?? "",
          gender: genders[index] ?? "",
          maritalStatus: maritalStatuses[index] ?? "",
          bloodGroup: bloodGroups[index] ?? "",
          employmentType: employmentTypes[index] ?? "",
        });
      }
      workbook.definedNames.add(`'Dropdown Values'!$A$2:$A$${orderedDepartments.length + 1}`, "EmployeeUploadDepartments");
      workbook.definedNames.add(`'Dropdown Values'!$B$2:$B$${orderedDesignations.length + 1}`, "EmployeeUploadDesignations");
      workbook.definedNames.add(`'Dropdown Values'!$C$2:$C$${Math.max(reportingManagers.length, 1) + 1}`, "EmployeeUploadReportingManagers");
      workbook.definedNames.add(`'Dropdown Values'!$D$2:$D$${statuses.length + 1}`, "EmployeeUploadStatuses");
      workbook.definedNames.add(`'Dropdown Values'!$E$2:$E$${genders.length + 1}`, "EmployeeUploadGenders");
      workbook.definedNames.add(`'Dropdown Values'!$F$2:$F$${maritalStatuses.length + 1}`, "EmployeeUploadMaritalStatuses");
      workbook.definedNames.add(`'Dropdown Values'!$G$2:$G$${bloodGroups.length + 1}`, "EmployeeUploadBloodGroups");
      workbook.definedNames.add(`'Dropdown Values'!$H$2:$H$${employmentTypes.length + 1}`, "EmployeeUploadEmploymentTypes");

      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF214E45" } };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + templateColumns.length)}1` };

      const columnNumber = new Map(templateColumns.map((column, index) => [column.key, index + 1]));
      for (let row = 2; row <= templateRows + 1; row += 1) {
        sheet.getCell(row, columnNumber.get("dateOfBirth") as number).numFmt = "yyyy-mm-dd";
        sheet.getCell(row, columnNumber.get("joiningDate") as number).numFmt = "yyyy-mm-dd";
        sheet.getCell(row, columnNumber.get("confirmationDate") as number).numFmt = "yyyy-mm-dd";
        sheet.getCell(row, columnNumber.get("gender") as number).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ["=EmployeeUploadGenders"],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Invalid gender",
          error: "Choose a gender from the dropdown, or leave it blank.",
        };
        sheet.getCell(row, columnNumber.get("maritalStatus") as number).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ["=EmployeeUploadMaritalStatuses"],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Invalid marital status",
          error: "Choose a marital status from the dropdown, or leave it blank.",
        };
        sheet.getCell(row, columnNumber.get("bloodGroup") as number).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ["=EmployeeUploadBloodGroups"],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Invalid blood group",
          error: "Choose a blood group from the dropdown, or leave it blank.",
        };
        sheet.getCell(row, columnNumber.get("department") as number).dataValidation = {
          type: "list",
          allowBlank: false,
          formulae: ["=EmployeeUploadDepartments"],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Invalid department",
          error: "Choose a department from the dropdown.",
        };
        sheet.getCell(row, columnNumber.get("designation") as number).dataValidation = {
          type: "list",
          allowBlank: false,
          formulae: ["=EmployeeUploadDesignations"],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Invalid designation",
          error: "Choose a designation from the dropdown.",
        };
        sheet.getCell(row, columnNumber.get("reportingManager") as number).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ["=EmployeeUploadReportingManagers"],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Invalid reporting manager",
          error: "Choose a reporting manager from the dropdown, or leave it blank.",
        };
        sheet.getCell(row, columnNumber.get("status") as number).dataValidation = {
          type: "list",
          allowBlank: false,
          formulae: ["=EmployeeUploadStatuses"],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Invalid status",
          error: "Choose a status from the dropdown.",
        };
        sheet.getCell(row, columnNumber.get("employmentType") as number).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ["=EmployeeUploadEmploymentTypes"],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Invalid employment type",
          error: "Choose an employment type from the dropdown, or leave it blank.",
        };
      }
      dropdownValues.state = "hidden";

      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = "employee-upload-template.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (apiError) {
      setEmployeeUploadError(getErrorMessage(apiError));
    }
  }

  async function readEmployeeUploadRows(file: File, requiresEmployeeCode: boolean) {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      throw new Error("Use the downloaded XLSX employee template so the dropdown values are retained.");
    }

    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.getWorksheet("Employee Upload");
    if (!sheet) {
      throw new Error("This is not an employee upload template. Download a new template and try again.");
    }

    const requiredColumns = employeeUploadColumns(requiresEmployeeCode);
    const columnPositions = new Map<EmployeeUploadColumnKey, number>();
    for (let column = 1; column <= sheet.columnCount; column += 1) {
      const key = employeeUploadHeaderKey(excelUploadCellText(sheet.getRow(1).getCell(column).value));
      if (key) columnPositions.set(key, column);
    }
    const missingColumns = requiredColumns.filter((column) => !columnPositions.has(column.key));
    if (missingColumns.length) {
      throw new Error(`The upload is missing: ${missingColumns.map((column) => column.header.replace(" *", "")).join(", ")}.`);
    }

    const sourceRows: Array<{ line: number; values: Record<EmployeeUploadColumnKey, string> }> = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = Object.fromEntries(
        requiredColumns.map((column) => [
          column.key,
          excelUploadCellText(
            row.getCell(columnPositions.get(column.key) as number).value,
            ["dateOfBirth", "joiningDate", "confirmationDate"].includes(column.key),
          ),
        ]),
      ) as Record<EmployeeUploadColumnKey, string>;
      if (Object.values(values).some(Boolean)) sourceRows.push({ line: rowNumber, values });
    });
    if (!sourceRows.length) throw new Error("The upload file has no employee rows.");
    if (sourceRows.length > 500) throw new Error("Upload up to 500 employees at a time.");
    return sourceRows;
  }

  async function validateEmployeeUpload() {
    if (!employeeUploadFile) {
      setEmployeeUploadError("Choose the completed employee template first.");
      return;
    }

    setValidatingEmployeeUpload(true);
    setEmployeeUploadRows([]);
    setEmployeeUploadError("");
    setEmployeeUploadMessage("");
    try {
      const [latestSettings, activeDepartments, activeDesignationPage, employeePage] = await Promise.all([
        employeeSettingsApi.get(),
        departmentApi.active(),
        designationApi.search({ active: true, page: 0, size: 500 }),
        employeeApi.search({ page: 0, size: 1000 }),
      ]);
      const requiresEmployeeCode = latestSettings.codeMode === "MANUAL";
      const sourceRows = await readEmployeeUploadRows(employeeUploadFile, requiresEmployeeCode);
      setSettings(latestSettings);
      setDepartments(activeDepartments);
      setDesignations(activeDesignationPage.content);
      setAllEmployees(employeePage.content);
      const departmentByName = new Map(activeDepartments.map((department) => [department.name.trim().toLowerCase(), department]));
      const designationByLabel = new Map(activeDesignationPage.content.map((designation) => [designationUploadLabel(designation).trim().toLowerCase(), designation]));
      const managerByLabel = new Map(
        employeePage.content
          .filter((employee) => employee.status !== "TERMINATED")
          .map((employee) => [reportingManagerUploadLabel(employee).trim().toLowerCase(), employee]),
      );
      const existingCodes = new Set(employeePage.content.map((employee) => employee.employeeCode.trim().toUpperCase()));
      const existingEmails = new Set(employeePage.content.map((employee) => employee.email.trim().toLowerCase()));
      const uploadedCodes = new Set<string>();
      const uploadedEmails = new Set<string>();

      const preview = sourceRows.map(({ line, values }, index): EmployeeUploadRow => {
        const employeeCode = normalizeUploadValue(values.employeeCode ?? "").toUpperCase();
        const firstName = normalizeUploadValue(values.firstName);
        const lastName = normalizeUploadValue(values.lastName);
        const gender = normalizeUploadValue(values.gender);
        const dateOfBirth = normalizeUploadValue(values.dateOfBirth);
        const maritalStatus = normalizeUploadValue(values.maritalStatus);
        const bloodGroup = normalizeUploadValue(values.bloodGroup);
        const nationality = normalizeUploadValue(values.nationality);
        const aadhaarNumber = normalizeUploadValue(values.aadhaarNumber);
        const taxIdentificationNumber = normalizeUploadValue(values.taxIdentificationNumber).toUpperCase();
        const phone = normalizeUploadValue(values.phone);
        const alternateMobileNumber = normalizeUploadValue(values.alternateMobileNumber);
        const personalEmail = normalizeUploadValue(values.personalEmail).replace(/^mailto:/i, "").toLowerCase();
        const email = normalizeUploadValue(values.email).replace(/^mailto:/i, "").toLowerCase();
        const joiningDate = normalizeUploadValue(values.joiningDate);
        const employmentType = normalizeUploadValue(values.employmentType);
        const confirmationDate = normalizeUploadValue(values.confirmationDate);
        const biometricId = normalizeUploadValue(values.biometricId);
        const department = normalizeUploadValue(values.department);
        const designation = normalizeUploadValue(values.designation);
        const reportingManager = normalizeUploadValue(values.reportingManager);
        const status = normalizeUploadValue(values.status).toUpperCase().replace(/\s+/g, "_");
        const errors: string[] = [];
        const selectedDepartment = departmentByName.get(department.toLowerCase());
        const selectedDesignation = designationByLabel.get(designation.toLowerCase());
        const selectedReportingManager = reportingManager ? managerByLabel.get(reportingManager.toLowerCase()) : undefined;

        if (requiresEmployeeCode) {
          if (!employeeCode) errors.push("Employee Code is required.");
          else if (existingCodes.has(employeeCode)) errors.push("Employee Code already exists.");
          else if (uploadedCodes.has(employeeCode)) errors.push("Employee Code is repeated in this upload.");
          uploadedCodes.add(employeeCode);
        }
        if (!firstName) errors.push("First Name is required.");
        if (!lastName) errors.push("Last Name is required.");
        if (gender && !genders.includes(gender)) errors.push("Choose a valid Gender from the dropdown.");
        if (dateOfBirth && !isValidUploadDate(dateOfBirth)) errors.push("Date of Birth must be a valid YYYY-MM-DD date.");
        if (maritalStatus && !maritalStatuses.includes(maritalStatus)) errors.push("Choose a valid Marital Status from the dropdown.");
        if (bloodGroup && !bloodGroups.includes(bloodGroup)) errors.push("Choose a valid Blood Group from the dropdown.");
        if (nationality.length > 80) errors.push("Nationality must be 80 characters or fewer.");
        if (aadhaarNumber && !validateAadhaar(aadhaarNumber)) errors.push("Aadhaar Number must contain exactly 12 digits.");
        if (taxIdentificationNumber && !validatePan(taxIdentificationNumber)) errors.push("PAN Number must follow the format ABCDE1234F.");
        if (phone && !validateMobile(phone)) errors.push("Mobile Number must be a valid 10-digit Indian mobile number.");
        if (alternateMobileNumber && !validateMobile(alternateMobileNumber)) errors.push("Alternate Mobile Number must be a valid 10-digit Indian mobile number.");
        if (personalEmail && !validateEmail(personalEmail)) errors.push("Enter a valid Personal Email.");
        if (!email || !validateEmail(email)) errors.push("Enter a valid Official Email.");
        else if (existingEmails.has(email)) errors.push("Official Email already exists.");
        else if (uploadedEmails.has(email)) errors.push("Official Email is repeated in this upload.");
        uploadedEmails.add(email);
        if (!joiningDate || !isValidUploadDate(joiningDate)) errors.push("Joining Date must be a valid YYYY-MM-DD date.");
        if (employmentType && !employmentTypes.includes(employmentType)) errors.push("Choose a valid Employment Type from the dropdown.");
        if (confirmationDate && !isValidUploadDate(confirmationDate)) errors.push("Confirmation Date must be a valid YYYY-MM-DD date.");
        if (biometricId.length > 80) errors.push("Biometric ID must be 80 characters or fewer.");
        if (!selectedDepartment) errors.push("Choose a valid Department from the dropdown.");
        if (!selectedDesignation) errors.push("Choose a valid Designation from the dropdown.");
        else if (selectedDepartment && selectedDesignation.departmentId !== selectedDepartment.id) {
          errors.push("The selected designation does not belong to the selected department.");
        }
        if (reportingManager && !selectedReportingManager) {
          errors.push("Choose a valid Reporting Manager from the dropdown, or leave it blank.");
        }
        if (!statuses.includes(status as EmploymentStatus)) errors.push("Choose a valid Status from the dropdown.");

        const row: EmployeeUploadRow = {
          id: index + 1,
          line,
          employeeCode,
          firstName,
          lastName,
          email,
          joiningDate,
          department,
          designation,
          reportingManager,
          status,
          errors,
        };
        if (!errors.length && selectedDepartment && selectedDesignation) {
          row.payload = {
            employeeCode: requiresEmployeeCode ? employeeCode : "",
            firstName,
            lastName,
            email,
            personalEmail: personalEmail || undefined,
            phone: phone || undefined,
            alternateMobileNumber: alternateMobileNumber || undefined,
            gender: gender || undefined,
            maritalStatus: maritalStatus || undefined,
            bloodGroup: bloodGroup || undefined,
            nationality: nationality || undefined,
            aadhaarNumber: aadhaarNumber || undefined,
            dateOfBirth: dateOfBirth || undefined,
            joiningDate,
            confirmationDate: confirmationDate || undefined,
            baseSalary: 0,
            employmentType: employmentType || undefined,
            biometricId: biometricId || undefined,
            taxIdentificationNumber: taxIdentificationNumber || undefined,
            status: status as EmploymentStatus,
            departmentId: selectedDepartment.id,
            designationId: selectedDesignation.id,
            managerId: selectedReportingManager?.id,
          };
        }
        return row;
      });

      setEmployeeUploadRows(preview);
      const invalidRows = preview.filter((row) => row.errors.length).length;
      setEmployeeUploadMessage(
        invalidRows
          ? `${preview.length - invalidRows} of ${preview.length} employee row(s) are ready. Fix the highlighted rows before saving.`
          : `${preview.length} employee row(s) validated. Review the preview, then save the upload.`,
      );
    } catch (apiError) {
      setEmployeeUploadError(apiError instanceof Error ? apiError.message : getErrorMessage(apiError));
    } finally {
      setValidatingEmployeeUpload(false);
    }
  }

  async function saveEmployeeUpload() {
    if (!employeeUploadRows.length) {
      setEmployeeUploadError("Validate an employee upload before saving.");
      return;
    }
    if (employeeUploadRows.some((row) => row.errors.length)) {
      setEmployeeUploadError("Fix all employee upload errors before saving.");
      return;
    }
    const payloads = employeeUploadRows.map((row) => row.payload).filter((payload): payload is EmployeePayload => Boolean(payload));
    if (payloads.length !== employeeUploadRows.length) {
      setEmployeeUploadError("Validate the employee upload again before saving.");
      return;
    }

    setSavingEmployeeUpload(true);
    setEmployeeUploadError("");
    try {
      await employeeApi.bulkCreate(payloads);
      if (settings.codeMode === "AUTO") setSettings(await employeeSettingsApi.get());
      setEmployeeUploadMessage(`${payloads.length} employee(s) saved successfully.`);
      setEmployeeUploadRows([]);
      setEmployeeUploadFile(undefined);
      if (employeeUploadInputRef.current) employeeUploadInputRef.current.value = "";
      loadEmployees();
      loadEmployeeDirectory();
    } catch (apiError) {
      setEmployeeUploadError(getErrorMessage(apiError));
    } finally {
      setSavingEmployeeUpload(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const employeeCode = editing
      ? form.employeeCode.trim()
      : settings.codeMode === "AUTO"
        ? ""
        : form.employeeCode.trim();

    if ((!employeeCode && (editing || settings.codeMode !== "AUTO")) || !form.firstName.trim() || !form.lastName.trim() || !form.officialEmail.trim()) {
      showFormError("Employee code, first name, last name, and official email are required.");
      return;
    }
    if (!validateEmail(form.officialEmail) || (form.personalEmail && !validateEmail(form.personalEmail))) {
      showFormError("Enter valid official and personal email addresses.");
      return;
    }
    if ((form.mobileNumber && !validateMobile(form.mobileNumber)) || (form.alternateMobileNumber && !validateMobile(form.alternateMobileNumber))) {
      showFormError("Mobile numbers must be valid 10-digit Indian mobile numbers.");
      return;
    }
    if (form.aadhaarNumber && !validateAadhaar(form.aadhaarNumber)) {
      showFormError("Aadhaar number must contain exactly 12 digits.");
      return;
    }
    if (form.panNumber && !validatePan(form.panNumber)) {
      showFormError("PAN number must follow the format ABCDE1234F.");
      return;
    }
    if (form.ifscCode && !validateIfsc(form.ifscCode)) {
      showFormError("IFSC code must follow the standard format, for example HDFC0001234.");
      return;
    }
    if (employeeCode && codeExists(employeeCode)) {
      showFormError("Employee Code must be unique. Duplicate Employee Codes are not allowed.");
      return;
    }
    if (!form.departmentId || !form.designationId) {
      showFormError("Department and designation are required.");
      return;
    }
    const pendingDocumentTypes = (isPersonnelMode ? [] : form.documents.filter((item) => item.file)).map((item) => item.type.toLowerCase());
    const duplicatePendingType = pendingDocumentTypes.find((type, index) => pendingDocumentTypes.indexOf(type) !== index);
    if (duplicatePendingType) {
      showFormError("Each uploaded document must use a unique document type. Change the document type before saving.");
      return;
    }

    try {
      const payload = { ...toPayload(), employeeCode };
      let savedEmployee: Employee;
      if (isPersonnelMode) {
        savedEmployee = await employeeApi.updateMe(payload);
      } else if (editing) {
        savedEmployee = await employeeApi.update(editing.id, payload);
      } else {
        savedEmployee = await employeeApi.create(payload);
        if (settings.codeMode === "AUTO") {
          const latestSettings = await employeeSettingsApi.get();
          setSettings(latestSettings);
        }
      }
      if (!isPersonnelMode && form.deleteProfilePhoto && !form.profilePhotoFile) {
        await employeeApi.deleteProfilePhoto(savedEmployee.id).catch(() => undefined);
      }
      if (!isPersonnelMode && form.profilePhotoFile) {
        await employeeApi.uploadProfilePhoto(savedEmployee.id, form.profilePhotoFile, (progress) => {
          setFileMessage(`Uploading profile photo ${progress}%`);
        });
      }
      for (const document of isPersonnelMode ? [] : form.documents.filter((item) => item.file)) {
        const duplicate = form.documents.some(
          (item) => item.persistedId && item.type.toLowerCase() === document.type.toLowerCase(),
        );
        const replace = duplicate
          ? window.confirm(`${document.type} already exists. Replace the existing document with ${document.fileName}?`)
          : false;
        if (duplicate && !replace) {
          continue;
        }
        await employeeApi.uploadDocument(
          savedEmployee.id,
          { file: document.file as File, documentCategory: document.type, replace },
          (progress) => {
            setForm((current) => ({
              ...current,
              documents: current.documents.map((item) => (item.id === document.id ? { ...item, uploadProgress: progress } : item)),
            }));
          },
        );
      }
      setModalOpen(false);
      loadEmployees();
      loadEmployeeDirectory();
    } catch (apiError) {
      showFormError(getErrorMessage(apiError));
    }
  }

  async function terminate(id: number) {
    if (!window.confirm("Mark this employee as terminated?")) {
      return;
    }
    await employeeApi.terminate(id);
    loadEmployees();
    loadEmployeeDirectory();
  }

  const columns: Column<Employee>[] = [
    {
      header: "Profile Photo",
      cell: (employee) => (
        <div className="flex items-center gap-3">
          {thumbnailUrls[employee.id] ? (
            <img
              src={thumbnailUrls[employee.id]}
              alt={employee.fullName}
              className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white"
            />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-moss text-sm font-extrabold text-white">
              {employee.firstName.charAt(0)}
              {employee.lastName.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-bold text-ink">{employee.fullName}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">{employee.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Contact",
      cell: (employee) => (
        <div>
          <p>{employee.email}</p>
          <p className="text-xs text-ink/45">{employee.phone || "No phone"}</p>
        </div>
      ),
    },
    { header: "Department", cell: (employee) => employee.departmentName },
    { header: "Designation", cell: (employee) => employee.designationTitle },
    { header: "Joined", cell: (employee) => formatDate(employee.joiningDate) },
    { header: "Status", cell: (employee) => <Badge value={employee.status} /> },
    {
      header: "Actions",
      cell: (employee) => (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="px-3"
            title={`View ${employee.fullName}`}
            aria-label={`View ${employee.fullName}`}
            onClick={() => openEmployeeView(employee)}
          >
            <Eye size={15} />
          </Button>
          {canEditProfile ? (
            <>
              <Button type="button" variant="secondary" className="px-3" onClick={() => openEdit(employee)}>
                <Edit3 size={15} />
              </Button>
              {canTerminateEmployees && (
                <Button type="button" variant="danger" className="px-3" onClick={() => terminate(employee.id)}>
                  <Trash2 size={15} />
                </Button>
              )}
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">
              {isPersonnelMode ? "Personnel" : "People"}
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">
              {isPersonnelMode ? "My Profile" : "Employees"}
            </h2>
          </div>
          {canManageEmployees && (
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={openCreate}>
                <Plus size={18} />
                New Employee
              </Button>
            </div>
          )}
        </div>

        {!isPersonnelMode && (
          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_210px_240px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
              <Input
                aria-label="Search employees"
                placeholder="Search by name, code, or email"
                className="pl-11"
                value={search}
                onChange={(event) => {
                  setPage(0);
                  setSearch(event.target.value);
                }}
              />
            </div>
            <SearchableSelect
              aria-label="Filter by status"
              value={statusFilter}
              options={[{ value: "", label: "All statuses" }, ...statuses.map((status) => ({ value: status, label: status }))]}
              onChange={(value) => {
                setPage(0);
                setStatusFilter(value);
              }}
            />
            <SearchableSelect
              aria-label="Filter by department"
              value={departmentFilter}
              options={[{ value: "", label: "All departments" }, ...departmentOptions]}
              onChange={(value) => {
                setPage(0);
                setDepartmentFilter(value);
              }}
            />
          </div>
        )}

      </Card>

      {pageError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <span>{pageError}</span>
        </div>
      )}

      <DataTable
        rows={employees.content}
        columns={columns}
        loading={loading}
        page={page}
        totalPages={employees.totalPages}
        totalElements={employees.totalElements}
        onPageChange={setPage}
        getRowKey={(employee) => employee.id}
      />

      {canManageEmployees && (
        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-fern" size={19} />
                <h3 className="font-display text-xl font-extrabold text-ink">Employee uploader</h3>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-ink/60">
                Download a sheet with the mandatory employee details plus optional personal and employment information. Department, designation, status, and standard profile values use dropdowns; validate the completed sheet here before saving it.
              </p>
              <p className="mt-1 text-xs font-semibold text-ink/45">
                Salary is managed separately and is not part of this upload.
                {settings.codeMode === "MANUAL"
                  ? " Employee Code is included because your organization uses manual employee codes."
                  : " Employee codes will be generated automatically when the upload is saved."}
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={downloadEmployeeUploadTemplate} disabled={validatingEmployeeUpload || savingEmployeeUpload}>
              <Download size={17} />
              Download template
            </Button>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <input
              ref={employeeUploadInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(event) => {
                setEmployeeUploadFile(event.target.files?.[0]);
                setEmployeeUploadRows([]);
                setEmployeeUploadError("");
                setEmployeeUploadMessage("");
              }}
            />
            <Button type="button" variant="secondary" onClick={() => employeeUploadInputRef.current?.click()} disabled={validatingEmployeeUpload || savingEmployeeUpload}>
              <UploadCloud size={17} />
              Choose completed sheet
            </Button>
            <span className="min-w-0 truncate text-sm font-semibold text-ink/60">
              {employeeUploadFile ? employeeUploadFile.name : "No file selected"}
            </span>
            <Button type="button" onClick={validateEmployeeUpload} disabled={!employeeUploadFile || validatingEmployeeUpload || savingEmployeeUpload}>
              <FileSpreadsheet size={17} />
              {validatingEmployeeUpload ? "Validating..." : "Validate sheet"}
            </Button>
          </div>
          {(employeeUploadError || employeeUploadMessage) && (
            <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${employeeUploadError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {employeeUploadError || employeeUploadMessage}
            </p>
          )}
        </Card>
      )}

      {canManageEmployees && employeeUploadRows.length > 0 && (
        <Card className="overflow-hidden border-2 border-fern/20 p-0">
          <div className="flex flex-col gap-4 border-b border-moss/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-xl font-extrabold text-ink">Employee upload preview</h3>
              <p className="mt-1 text-sm text-ink/60">
                {employeeUploadRows.some((row) => row.errors.length)
                  ? "Fix every highlighted row, then validate the sheet again."
                  : "All rows are valid and ready to save together."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEmployeeUploadRows([]);
                  setEmployeeUploadMessage("");
                }}
                disabled={savingEmployeeUpload}
              >
                Clear preview
              </Button>
              <Button type="button" onClick={saveEmployeeUpload} disabled={employeeUploadRows.some((row) => row.errors.length > 0) || savingEmployeeUpload}>
                <Save size={17} />
                {savingEmployeeUpload ? "Saving..." : `Save ${employeeUploadRows.length} employee(s)`}
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-moss/5 text-xs font-extrabold uppercase tracking-[0.14em] text-ink/55">
                <tr>
                  <th className="px-5 py-3">Line</th>
                  {settings.codeMode === "MANUAL" && <th className="px-5 py-3">Employee code</th>}
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Official email</th>
                  <th className="px-5 py-3">Joining date</th>
                  <th className="px-5 py-3">Department / designation</th>
                  <th className="px-5 py-3">Reporting manager</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-moss/10">
                {employeeUploadRows.map((row) => (
                  <tr key={row.id} className={row.errors.length ? "bg-red-50/40" : undefined}>
                    <td className="px-5 py-3 font-semibold text-ink/60">{row.line}</td>
                    {settings.codeMode === "MANUAL" && <td className="px-5 py-3 font-bold text-ink">{row.employeeCode || "-"}</td>}
                    <td className="px-5 py-3 font-bold text-ink">{[row.firstName, row.lastName].filter(Boolean).join(" ") || "-"}</td>
                    <td className="px-5 py-3 font-semibold text-ink/70">{row.email || "-"}</td>
                    <td className="px-5 py-3 font-semibold text-ink/70">{row.joiningDate || "-"}</td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-ink">{row.department || "-"}</p>
                      <p className="mt-1 text-xs font-semibold text-ink/50">{row.designation || "-"}</p>
                    </td>
                    <td className="px-5 py-3 font-semibold text-ink/70">{row.reportingManager || "-"}</td>
                    <td className="px-5 py-3 font-bold text-ink/70">{row.status || "-"}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.errors.length ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {row.errors.length ? "Needs changes" : "Ready"}
                      </span>
                      {row.errors.length > 0 && <p className="mt-2 max-w-sm text-xs font-semibold leading-5 text-red-700">{row.errors.join(" ")}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {isPersonnelMode && currentEmployee && (
        <section className="grid gap-6 xl:grid-cols-[260px_1fr]">
          <Card className="self-start">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">My Profile</p>
            <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">Menu</h3>
            <div className="mt-5 space-y-2">
              <ProfileMenuButton icon={UserRound} label="Profile" active={profilePanel === "profile"} onClick={() => setProfilePanel("profile")} />
              <ProfileMenuButton icon={GitBranch} label="Hierarchy Chart" active={profilePanel === "hierarchy"} onClick={() => setProfilePanel("hierarchy")} />
              <ProfileMenuButton icon={GraduationCap} label="Education" active={profilePanel === "education"} onClick={() => setProfilePanel("education")} />
              <ProfileMenuButton icon={BriefcaseBusiness} label="Experience" active={profilePanel === "experience"} onClick={() => setProfilePanel("experience")} />
            </div>
          </Card>

          <Card>
            {profilePanel === "profile" && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Profile</p>
                  <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">{currentEmployee.fullName}</h3>
                  <p className="mt-1 text-sm font-semibold text-ink/55">
                    {currentEmployee.employeeCode} · {currentEmployee.designationTitle}
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-3xl bg-oat/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">Department</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{currentEmployee.departmentName}</p>
                  </div>
                  <div className="rounded-3xl bg-oat/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">Manager</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{currentEmployee.managerName ?? "No manager"}</p>
                  </div>
                  <div className="rounded-3xl bg-oat/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">Reports</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{hierarchy?.current.directReportsCount ?? 0}</p>
                  </div>
                </div>
              </div>
            )}

            {profilePanel === "hierarchy" &&
              (hierarchy ? (
                <HierarchyChart hierarchy={hierarchy} />
              ) : (
                <p className="rounded-3xl bg-oat/60 p-4 text-sm font-semibold text-ink/55">Hierarchy data is not available right now.</p>
              ))}

            {profilePanel === "education" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Education</p>
                  <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">Academic History</h3>
                </div>
                {(currentEmployee.education?.length ?? 0) === 0 ? (
                  <p className="rounded-3xl bg-oat/60 p-4 text-sm font-semibold text-ink/55">No education entries saved yet.</p>
                ) : (
                  <div className="grid gap-3">
                    {(currentEmployee.education ?? []).map((record, index) => (
                      <div key={`${record.id ?? index}`} className="rounded-3xl border border-moss/10 bg-white/80 p-4">
                        <p className="text-sm font-bold text-ink">{record.qualification || "Qualification"}</p>
                        <p className="mt-1 text-sm text-ink/65">
                          {record.institution || "-"} · {record.university || "-"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-ink/45">
                          {record.yearOfPassing || "-"} · {record.score || "-"} · {record.specialization || "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {profilePanel === "experience" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Experience</p>
                  <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">Work History</h3>
                </div>
                {(currentEmployee.experience ?? []).length === 0 ? (
                  <p className="rounded-3xl bg-oat/60 p-4 text-sm font-semibold text-ink/55">No experience entries saved yet.</p>
                ) : (
                  <div className="grid gap-3">
                    {(currentEmployee.experience ?? []).map((record, index) => (
                      <div key={`${record.id ?? index}`} className="rounded-3xl border border-moss/10 bg-white/80 p-4">
                        <p className="text-sm font-bold text-ink">{record.company || "Company"}</p>
                        <p className="mt-1 text-sm text-ink/65">
                          {record.designation || "-"} · {record.startDate || "-"} to {record.endDate || "-"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-ink/45">
                          {record.totalExperience || "-"} · {record.lastDrawnSalary || "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </section>
      )}

      <Modal
        open={Boolean(viewingEmployee)}
        onClose={() => setViewingEmployee(null)}
        title="Employee details"
        description="Read-only employee information."
      >
        {viewingEmployee && (
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-col gap-4 rounded-3xl border border-moss/10 bg-white/75 p-4 sm:flex-row sm:items-center sm:p-5">
              {viewProfilePhotoUrl ? (
                <img src={viewProfilePhotoUrl} alt={viewingEmployee.fullName} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-moss/15" />
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-moss text-2xl font-extrabold text-white">
                  {viewingEmployee.firstName.charAt(0)}
                  {viewingEmployee.lastName.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="truncate font-display text-2xl font-extrabold text-ink">{viewingEmployee.fullName}</h3>
                  <Badge value={viewingEmployee.status} />
                </div>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-fern">{viewingEmployee.employeeCode}</p>
                <p className="mt-3 text-sm font-semibold text-ink/60">{viewingEmployee.designationTitle} · {viewingEmployee.departmentName}</p>
              </div>
            </div>

            <section className="space-y-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-fern">Employment</p>
                <p className="mt-1 text-sm font-semibold text-ink/55">Assignment and employment milestones.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl bg-oat/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Branch</p>
                  <p className="mt-2 break-words text-sm font-semibold text-ink">{viewingEmployee.branchName || "Not assigned"}</p>
                </div>
                <div className="rounded-2xl bg-oat/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Employment type</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{viewingEmployee.employmentType || "Not specified"}</p>
                </div>
                <div className="rounded-2xl bg-oat/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Joined</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{formatDate(viewingEmployee.joiningDate)}</p>
                </div>
                <div className="rounded-2xl bg-oat/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Confirmation date</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{viewingEmployee.confirmationDate ? formatDate(viewingEmployee.confirmationDate) : "Not confirmed"}</p>
                </div>
                <div className="rounded-2xl bg-oat/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Probation period</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{viewingEmployee.probationPeriod || "Not specified"}</p>
                </div>
                <div className="rounded-2xl bg-oat/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Department</p>
                  <p className="mt-2 break-words text-sm font-semibold text-ink">{viewingEmployee.departmentName}</p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-fern">Contact & reporting</p>
                <p className="mt-1 text-sm font-semibold text-ink/55">Official contact details and reporting lines.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl bg-oat/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Official email</p>
                  <p className="mt-2 break-words text-sm font-semibold text-ink">{viewingEmployee.email || "Not available"}</p>
                </div>
                <div className="rounded-2xl bg-oat/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Mobile</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{viewingEmployee.phone || "Not available"}</p>
                </div>
                <div className="rounded-2xl bg-oat/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Alternate mobile</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{viewingEmployee.alternateMobileNumber || "Not available"}</p>
                </div>
                <div className="rounded-2xl bg-oat/60 p-4 sm:col-span-2 lg:col-span-1">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Reporting manager</p>
                  <p className="mt-2 break-words text-sm font-semibold text-ink">{viewingEmployee.managerName || "Not assigned"}</p>
                </div>
                <div className="rounded-2xl bg-oat/60 p-4 sm:col-span-2 lg:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">HR manager</p>
                  <p className="mt-2 break-words text-sm font-semibold text-ink">{viewingEmployee.hrManagerName || "Not assigned"}</p>
                </div>
              </div>
            </section>

            {Boolean(viewingEmployee.primarySkill || viewingEmployee.secondarySkill || viewingEmployee.certifications || viewingEmployee.languagesKnown) && (
              <section className="space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-fern">Professional profile</p>
                  <p className="mt-1 text-sm font-semibold text-ink/55">Skills, certifications, and languages.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {viewingEmployee.primarySkill && (
                    <div className="rounded-2xl bg-oat/60 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Primary skill</p>
                      <p className="mt-2 break-words text-sm font-semibold text-ink">{viewingEmployee.primarySkill}</p>
                    </div>
                  )}
                  {viewingEmployee.secondarySkill && (
                    <div className="rounded-2xl bg-oat/60 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Secondary skill</p>
                      <p className="mt-2 break-words text-sm font-semibold text-ink">{viewingEmployee.secondarySkill}</p>
                    </div>
                  )}
                  {viewingEmployee.languagesKnown && (
                    <div className="rounded-2xl bg-oat/60 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Languages known</p>
                      <p className="mt-2 break-words text-sm font-semibold text-ink">{viewingEmployee.languagesKnown}</p>
                    </div>
                  )}
                  {viewingEmployee.certifications && (
                    <div className="rounded-2xl bg-oat/60 p-4 sm:col-span-2 lg:col-span-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Certifications</p>
                      <p className="mt-2 break-words text-sm font-semibold text-ink">{viewingEmployee.certifications}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {(viewingEmployee.education.some((record) => record.qualification || record.institution || record.university) || viewingEmployee.experience.some((record) => record.company || record.designation)) && (
              <section className="space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-fern">Background</p>
                  <p className="mt-1 text-sm font-semibold text-ink/55">Education and work experience summary.</p>
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {viewingEmployee.education.some((record) => record.qualification || record.institution || record.university) && (
                    <div className="rounded-3xl border border-moss/10 bg-white/75 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Education</p>
                      <div className="mt-3 space-y-3">
                        {viewingEmployee.education.filter((record) => record.qualification || record.institution || record.university).map((record, index) => (
                          <div key={`${record.id ?? index}`} className="rounded-2xl bg-oat/60 p-3">
                            <p className="break-words text-sm font-bold text-ink">{record.qualification || "Qualification"}{record.specialization ? ` · ${record.specialization}` : ""}</p>
                            <p className="mt-1 break-words text-sm font-semibold text-ink/60">{[record.institution, record.university].filter(Boolean).join(" · ") || "Not specified"}</p>
                            <p className="mt-1 text-xs font-semibold text-ink/45">{[record.yearOfPassing, record.score].filter(Boolean).join(" · ") || ""}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {viewingEmployee.experience.some((record) => record.company || record.designation) && (
                    <div className="rounded-3xl border border-moss/10 bg-white/75 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Experience</p>
                      <div className="mt-3 space-y-3">
                        {viewingEmployee.experience.filter((record) => record.company || record.designation).map((record, index) => (
                          <div key={`${record.id ?? index}`} className="rounded-2xl bg-oat/60 p-3">
                            <p className="break-words text-sm font-bold text-ink">{record.company || "Company"}</p>
                            <p className="mt-1 break-words text-sm font-semibold text-ink/60">{record.designation || "Role not specified"}</p>
                            <p className="mt-1 text-xs font-semibold text-ink/45">{[record.startDate, record.endDate].filter(Boolean).join(" to ") || "Dates not specified"}{record.totalExperience ? ` · ${record.totalExperience}` : ""}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isPersonnelMode ? "Update my profile" : editing ? "Edit employee" : "Create employee"}
        description={
          isPersonnelMode
            ? "Keep your personal, contact, address, and bank details current."
            : "Employee data powers payroll, leave, shift, and reporting workflows."
        }
      >
        <form onSubmit={handleSubmit} className="relative space-y-4">
          {error && (
            <div
              ref={errorAlertRef}
              role="alert"
              tabIndex={-1}
              className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm outline-none backdrop-blur-sm"
            >
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
              <span>{error}</span>
            </div>
          )}
          <Section title="Personal Information" defaultOpen>
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Employee Code"
                value={settings.codeMode === "AUTO" && !editing ? "" : form.employeeCode}
                disabled={Boolean(editing) || (settings.codeMode === "AUTO" && !editing)}
                placeholder={settings.codeMode === "AUTO" && !editing ? "Generated automatically on save" : undefined}
                onChange={(event) => setForm({ ...form, employeeCode: event.target.value })}
              />
              <Input label="First Name" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
              <Input label="Middle Name" value={form.middleName} onChange={(event) => setForm({ ...form, middleName: event.target.value })} />
              <Input label="Last Name" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
              <SearchableSelect
                label="Gender"
                value={form.gender}
                options={[{ value: "", label: "Select gender" }, ...genders.map((value) => ({ value, label: value }))]}
                onChange={(value) => setForm({ ...form, gender: value })}
              />
              <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
              <SearchableSelect
                label="Marital Status"
                value={form.maritalStatus}
                options={[{ value: "", label: "Select status" }, ...maritalStatuses.map((value) => ({ value, label: value }))]}
                onChange={(value) => setForm({ ...form, maritalStatus: value })}
              />
              <SearchableSelect
                label="Blood Group"
                value={form.bloodGroup}
                options={[{ value: "", label: "Select group" }, ...bloodGroups.map((value) => ({ value, label: value }))]}
                onChange={(value) => setForm({ ...form, bloodGroup: value })}
              />
              <Input label="Nationality" value={form.nationality} onChange={(event) => setForm({ ...form, nationality: event.target.value })} />
              <Input label="Aadhaar Number" maxLength={12} value={form.aadhaarNumber} onChange={(event) => setForm({ ...form, aadhaarNumber: event.target.value.replace(/\D/g, "") })} />
              <Input label="PAN Number" maxLength={10} value={form.panNumber} onChange={(event) => setForm({ ...form, panNumber: event.target.value.toUpperCase() })} />
              <Input label="Mobile Number" value={form.mobileNumber} onChange={(event) => setForm({ ...form, mobileNumber: event.target.value.replace(/\D/g, "") })} />
              <Input label="Alternate Mobile Number" value={form.alternateMobileNumber} onChange={(event) => setForm({ ...form, alternateMobileNumber: event.target.value.replace(/\D/g, "") })} />
              <Input label="Personal Email" type="email" value={form.personalEmail} onChange={(event) => setForm({ ...form, personalEmail: event.target.value })} />
              <Input label="Official Email" type="email" value={form.officialEmail} onChange={(event) => setForm({ ...form, officialEmail: event.target.value })} />
              {!isPersonnelMode && <div className="space-y-2 text-sm font-semibold text-ink/80">
                <span>Profile Photo</span>
                <div className="flex items-center gap-4 rounded-3xl border border-moss/10 bg-white/70 p-4">
                  {form.profilePhotoPreviewUrl ? (
                    <img src={form.profilePhotoPreviewUrl} alt="Employee profile" className="h-20 w-20 rounded-2xl object-cover" />
                  ) : (
                    <div className="grid h-20 w-20 place-items-center rounded-2xl bg-moss text-xl font-extrabold text-white">
                      {form.firstName.charAt(0) || "E"}
                      {form.lastName.charAt(0)}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => updateProfilePhoto(event.target.files?.[0])} />
                    {(form.profilePhotoPreviewUrl || form.hasExistingProfilePhoto) && (
                      <Button type="button" variant="danger" onClick={deleteProfilePhoto}>
                        <Trash2 size={15} />
                        Delete Photo
                      </Button>
                    )}
                  </div>
                </div>
              </div>}
            </div>
          </Section>

          <Section title="Employment Information">
            <div className="grid gap-4 md:grid-cols-3">
              <SearchableSelect
                label="Employment Type"
                value={form.employmentType}
                options={employmentTypeOptions}
                disabled={isPersonnelMode}
                onChange={(value) => setForm({ ...form, employmentType: value })}
              />
              <SearchableSelect
                label="Department"
                value={String(form.departmentId || "")}
                options={departmentOptions}
                disabled={isPersonnelMode}
                onChange={(value) => updateDepartment(Number(value))}
              />
              <SearchableSelect
                label="Designation"
                value={String(form.designationId || "")}
                options={designationOptions}
                disabled={isPersonnelMode}
                onChange={(value) => setForm({ ...form, designationId: Number(value) })}
              />
              <SearchableSelect
                label="Branch"
                value={String(form.branchId || "")}
                options={branchOptions}
                disabled={isPersonnelMode}
                onChange={(value) => setForm({ ...form, branchId: Number(value) })}
              />
              {!isPersonnelMode && (
                <>
                  <EmployeeAutocomplete
                    label="Reporting Manager"
                    value={form.reportingManager}
                    employees={allEmployees}
                    onChange={(employeeCode) => setForm({ ...form, reportingManager: employeeCode })}
                  />
                  <EmployeeAutocomplete
                    label="HR Manager"
                    value={form.hrManager}
                    employees={allEmployees}
                    onChange={(employeeCode) => setForm({ ...form, hrManager: employeeCode })}
                  />
                </>
              )}
              <Input label="Date of Joining" type="date" value={form.joiningDate} disabled={isPersonnelMode} onChange={(event) => setForm({ ...form, joiningDate: event.target.value })} />
              <Input label="Confirmation Date" type="date" value={form.confirmationDate} disabled={isPersonnelMode} onChange={(event) => setForm({ ...form, confirmationDate: event.target.value })} />
              <Input label="Probation Period" value={form.probationPeriod} disabled={isPersonnelMode} onChange={(event) => setForm({ ...form, probationPeriod: event.target.value })} />
              <SearchableSelect
                label="Employee Status"
                value={form.status}
                options={statusOptions}
                disabled={isPersonnelMode}
                onChange={(value) => setForm({ ...form, status: value as EmploymentStatus })}
              />
              <Input label="Biometric ID" value={form.biometricId} disabled={isPersonnelMode} onChange={(event) => setForm({ ...form, biometricId: event.target.value })} />
            </div>
          </Section>

          <Section title="Current Address">
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(form.currentAddress).map(([key, value]) => (
                <Input
                  key={key}
                  label={key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase())}
                  value={value}
                  onChange={(event) => updateCurrentAddress(key as keyof AddressFields, event.target.value)}
                />
              ))}
            </div>
          </Section>

          <Section title="Permanent Address">
            <label className="flex items-center gap-3 text-sm font-semibold text-ink/80">
              <input type="checkbox" checked={form.sameAsCurrentAddress} onChange={(event) => setSameAsCurrentAddress(event.target.checked)} />
              Same as Current Address
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(form.permanentAddress).map(([key, value]) => (
                <Input
                  key={key}
                  label={key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase())}
                  value={value}
                  disabled={form.sameAsCurrentAddress}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      permanentAddress: { ...form.permanentAddress, [key]: event.target.value },
                    })
                  }
                />
              ))}
            </div>
          </Section>

          <Section title="Emergency Contact">
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Contact Name" value={form.emergencyContactName} onChange={(event) => setForm({ ...form, emergencyContactName: event.target.value })} />
              <Input label="Relationship" value={form.emergencyRelationship} onChange={(event) => setForm({ ...form, emergencyRelationship: event.target.value })} />
              <Input label="Mobile Number" value={form.emergencyMobileNumber} onChange={(event) => setForm({ ...form, emergencyMobileNumber: event.target.value.replace(/\D/g, "") })} />
            </div>
          </Section>

          <Section title="Bank Information">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Account Holder Name" value={form.accountHolderName} onChange={(event) => setForm({ ...form, accountHolderName: event.target.value })} />
              <Input label="Bank Name" value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} />
              <Input label="Account Number" value={form.bankAccountNumber} onChange={(event) => setForm({ ...form, bankAccountNumber: event.target.value.replace(/\D/g, "") })} />
              <Input label="IFSC Code" value={form.ifscCode} onChange={(event) => setForm({ ...form, ifscCode: event.target.value.toUpperCase() })} />
            </div>
          </Section>

          {!isPersonnelMode && (
            <Section title="Documents">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-moss/25 bg-oat/50 p-6 text-center text-sm font-semibold text-ink/65">
                <UploadCloud className="mb-2 text-fern" size={24} />
                Upload multiple documents
                <input className="hidden" type="file" multiple onChange={(event) => addDocuments(event.target.files)} />
              </label>
              {fileMessage && <p className="rounded-2xl bg-oat/70 px-4 py-3 text-sm font-semibold text-ink/70">{fileMessage}</p>}
              <div className="grid gap-3">
                {form.documents.map((document) => (
                  <div key={document.id} className="grid gap-3 rounded-3xl border border-moss/10 bg-white/70 p-4 md:grid-cols-[220px_1fr_auto] md:items-center">
                    <Select
                      aria-label="Document type"
                      value={document.type}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          documents: form.documents.map((item) => (item.id === document.id ? { ...item, type: event.target.value } : item)),
                        })
                      }
                    >
                      {documentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                    <div>
                      <p className="text-sm font-semibold text-ink">{document.fileName}</p>
                      <p className="text-xs font-semibold text-ink/50">
                        {document.uploadedAt ? `Uploaded ${formatDate(document.uploadedAt)} by ${document.uploadedBy}` : "Pending upload"}
                      </p>
                      <p className="text-xs text-ink/45">
                        {formatFileSize(document.fileSize)} {document.uploadProgress !== undefined && document.uploadProgress < 100 ? `- ${document.uploadProgress}%` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {(document.previewSupported || supportsInlinePreview(document.fileType)) && (
                        <Button type="button" variant="secondary" className="px-3" onClick={() => previewDocument(document)}>
                          <Eye size={15} />
                        </Button>
                      )}
                      <Button type="button" variant="secondary" className="px-3" onClick={() => downloadDocument(document)}>
                        <Download size={15} />
                      </Button>
                      <label className="inline-flex cursor-pointer items-center rounded-2xl border border-moss/15 bg-white/80 px-3 py-2.5 text-sm font-semibold text-moss transition hover:bg-white">
                        <UploadCloud size={15} />
                        <input
                          className="hidden"
                          type="file"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) {
                              return;
                            }
                            setForm({
                              ...form,
                              documents: form.documents.map((item) =>
                                item.id === document.id
                                  ? {
                                      ...item,
                                      file,
                                      fileName: file.name,
                                      previewUrl: URL.createObjectURL(file),
                                      fileType: file.type,
                                      fileSize: file.size,
                                      previewSupported: supportsInlinePreview(file.type),
                                      uploadProgress: 0,
                                    }
                                  : item,
                              ),
                            });
                          }}
                        />
                      </label>
                      <Button
                        type="button"
                        variant="danger"
                        className="px-3"
                        onClick={() => removeDocument(document)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Education">
            <Button type="button" variant="secondary" onClick={addEducation}>
              <Plus size={16} />
              Add Education
            </Button>
            {form.education.map((record) => (
              <div key={record.id} className="grid gap-3 rounded-3xl border border-moss/10 bg-white/70 p-4 md:grid-cols-3">
                <Input label="Qualification" value={record.qualification} onChange={(event) => updateEducation(record.id, "qualification", event.target.value)} />
                <Input label="Institution" value={record.institution} onChange={(event) => updateEducation(record.id, "institution", event.target.value)} />
                <Input label="University" value={record.university} onChange={(event) => updateEducation(record.id, "university", event.target.value)} />
                <Input label="Year of Passing" value={record.yearOfPassing} onChange={(event) => updateEducation(record.id, "yearOfPassing", event.target.value)} />
                <Input label="Percentage / CGPA" value={record.score} onChange={(event) => updateEducation(record.id, "score", event.target.value)} />
                <Input label="Major / Specialization" value={record.specialization} onChange={(event) => updateEducation(record.id, "specialization", event.target.value)} />
                <Button type="button" variant="danger" onClick={() => setForm({ ...form, education: form.education.filter((item) => item.id !== record.id) })}>
                  <Trash2 size={15} />
                  Delete
                </Button>
              </div>
            ))}
          </Section>

          <Section title="Experience">
            <Button type="button" variant="secondary" onClick={addExperience}>
              <Plus size={16} />
              Add Experience
            </Button>
            {form.experience.map((record) => (
              <div key={record.id} className="grid gap-3 rounded-3xl border border-moss/10 bg-white/70 p-4 md:grid-cols-3">
                <Input label="Company" value={record.company} onChange={(event) => updateExperience(record.id, "company", event.target.value)} />
                <Input label="Designation" value={record.designation} onChange={(event) => updateExperience(record.id, "designation", event.target.value)} />
                <Input label="Start Date" type="date" value={record.startDate} onChange={(event) => updateExperience(record.id, "startDate", event.target.value)} />
                <Input label="End Date" type="date" value={record.endDate} onChange={(event) => updateExperience(record.id, "endDate", event.target.value)} />
                <Input label="Total Experience" value={record.totalExperience} readOnly />
                <Input label="Last Drawn Salary" type="number" value={record.lastDrawnSalary} onChange={(event) => updateExperience(record.id, "lastDrawnSalary", event.target.value)} />
                <Textarea label="Reason for Leaving" value={record.reasonForLeaving} onChange={(event) => updateExperience(record.id, "reasonForLeaving", event.target.value)} />
                <Button type="button" variant="danger" onClick={() => setForm({ ...form, experience: form.experience.filter((item) => item.id !== record.id) })}>
                  <Trash2 size={15} />
                  Delete
                </Button>
              </div>
            ))}
          </Section>

          <Section title="Skills">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Primary Skill" value={form.primarySkill} onChange={(event) => setForm({ ...form, primarySkill: event.target.value })} />
              <Input label="Secondary Skill" value={form.secondarySkill} onChange={(event) => setForm({ ...form, secondarySkill: event.target.value })} />
              <Textarea label="Certifications" value={form.certifications} onChange={(event) => setForm({ ...form, certifications: event.target.value })} />
              <Textarea label="Languages Known" value={form.languagesKnown} onChange={(event) => setForm({ ...form, languagesKnown: event.target.value })} />
            </div>
          </Section>

          <div className="sticky bottom-0 flex justify-end gap-3 border-t border-moss/10 bg-shell/95 py-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{isPersonnelMode ? "Save profile" : editing ? "Save changes" : "Create employee"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
