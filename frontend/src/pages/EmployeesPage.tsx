import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Download, Edit3, Eye, Plus, Search, Settings, Trash2, UploadCloud } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { departmentApi, designationApi, employeeApi } from "../api/payroll";
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
import { formatCurrency, formatDate } from "../lib/format";
import { useDebounce } from "../hooks/useDebounce";
import type {
  Department,
  Designation,
  Employee,
  EmployeeDocument as EmployeeDocumentMeta,
  EmployeePayload,
  EmploymentStatus,
  PageResponse,
} from "../types";

type EmployeeCodeMode = "AUTO" | "MANUAL";

interface EmployeeSettings {
  codeMode: EmployeeCodeMode;
  prefix: string;
  suffix: string;
  startingNumber: string;
  padding: string;
}

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
  branch: string;
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
  codeMode: "MANUAL",
  prefix: "EMP",
  suffix: "",
  startingNumber: "1",
  padding: "4",
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
  branch: "",
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

function generateEmployeeCode(settings: EmployeeSettings, offset = 0) {
  const number = Math.max(0, Number(settings.startingNumber) || 0) + offset;
  const padding = Math.max(1, Number(settings.padding) || 1);
  return `${settings.prefix}${String(number).padStart(padding, "0")}${settings.suffix}`;
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

function readEmployeeAddress(employee: Employee): AddressFields {
  return { ...emptyAddress, line1: employee.address ?? "" };
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

export function EmployeesPage() {
  const [employees, setEmployees] = useState(emptyPage);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(initialForm);
  const [settings, setSettings] = useState<EmployeeSettings>(initialSettings);
  const [error, setError] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});
  const [fileMessage, setFileMessage] = useState("");
  const errorAlertRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search);

  const loadEmployeeDirectory = useCallback(() => {
    employeeApi.search({ page: 0, size: 1000 }).then((employeePage) => setAllEmployees(employeePage.content));
  }, []);

  useEffect(() => {
    Promise.all([
      departmentApi.active(),
      designationApi.search({ active: true, page: 0, size: 500 }),
      employeeApi.search({ page: 0, size: 1000 }),
    ]).then(([departmentItems, designationPage, employeePage]) => {
      setDepartments(departmentItems);
      setDesignations(designationPage.content);
      setAllEmployees(employeePage.content);
      const departmentId = departmentItems[0]?.id || 0;
      const designationId =
        designationPage.content.find((designation) => designation.departmentId === departmentId)?.id ||
        designationPage.content[0]?.id ||
        0;
      setForm((current) => ({ ...current, departmentId, designationId }));
    });
  }, []);

  const loadEmployees = useCallback(() => {
    setLoading(true);
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
  }, [debouncedSearch, departmentFilter, page, statusFilter]);

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
    () =>
      ["Head Office", "Regional Office", "Plant", "Remote", "Client Location"].map((branch) => ({
        value: branch,
        label: branch,
      })),
    [],
  );

  const generatedCode = useMemo(() => generateEmployeeCode(settings), [settings]);
  const generatedPreview = useMemo(
    () => [0, 1, 2].map((offset) => generateEmployeeCode(settings, offset)).join("  "),
    [settings],
  );

  function codeExists(code: string) {
    return allEmployees.some(
      (employee) => employee.employeeCode.toLowerCase() === code.trim().toLowerCase() && employee.id !== editing?.id,
    );
  }

  function showFormError(message: string) {
    setError(message);
    window.setTimeout(() => {
      errorAlertRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      errorAlertRef.current?.focus({ preventScroll: true });
    }, 0);
  }

  function createInitialForm(departmentId: number, designationId: number): EmployeeForm {
    return {
      ...initialForm,
      employeeCode: settings.codeMode === "AUTO" ? generatedCode : "",
      departmentId,
      designationId,
    };
  }

  function openCreate() {
    const departmentId = departments[0]?.id || 0;
    const designationId =
      designations.find((designation) => designation.departmentId === departmentId)?.id || designations[0]?.id || 0;
    setEditing(null);
    setForm(createInitialForm(departmentId, designationId));
    setError("");
    setFileMessage("");
    setModalOpen(true);
  }

  async function openEdit(employee: Employee) {
    const address = readEmployeeAddress(employee);
    setEditing(employee);
    setForm({
      ...initialForm,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      officialEmail: employee.email,
      mobileNumber: employee.phone ?? "",
      dateOfBirth: employee.dateOfBirth ?? "",
      joiningDate: employee.joiningDate,
      baseSalary: String(employee.baseSalary),
      bankAccountNumber: employee.bankAccountNumber ?? "",
      panNumber: employee.taxIdentificationNumber ?? "",
      currentAddress: address,
      permanentAddress: address,
      profilePhotoPreviewUrl: "",
      hasExistingProfilePhoto: employee.hasProfilePhoto,
      deleteProfilePhoto: false,
      status: employee.status,
      departmentId: employee.departmentId,
      designationId: employee.designationId,
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
  }

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
    return {
      employeeCode: form.employeeCode.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.officialEmail.trim(),
      phone: form.mobileNumber || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      joiningDate: form.joiningDate,
      baseSalary: Number(form.baseSalary),
      bankAccountNumber: form.bankAccountNumber || undefined,
      taxIdentificationNumber: form.panNumber || undefined,
      address: addressToText(form.currentAddress) || undefined,
      status: form.status,
      departmentId: form.departmentId,
      designationId: form.designationId,
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const employeeCode = settings.codeMode === "AUTO" && !editing ? generatedCode : form.employeeCode.trim();

    if (!employeeCode || !form.firstName.trim() || !form.lastName.trim() || !form.officialEmail.trim()) {
      showFormError("Employee code, first name, last name, and official email are required.");
      return;
    }
    if (!validateEmail(form.officialEmail) || (form.personalEmail && !validateEmail(form.personalEmail))) {
      showFormError("Enter valid official and personal email addresses.");
      return;
    }
    if (!validateMobile(form.mobileNumber) || (form.alternateMobileNumber && !validateMobile(form.alternateMobileNumber))) {
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
    if (codeExists(employeeCode)) {
      showFormError("Employee Code must be unique. Duplicate Employee Codes are not allowed.");
      return;
    }
    if (!form.departmentId || !form.designationId) {
      showFormError("Department and designation are required.");
      return;
    }
    if (!form.baseSalary || Number(form.baseSalary) <= 0) {
      showFormError("Base salary must be greater than zero.");
      return;
    }
    const pendingDocumentTypes = form.documents.filter((item) => item.file).map((item) => item.type.toLowerCase());
    const duplicatePendingType = pendingDocumentTypes.find((type, index) => pendingDocumentTypes.indexOf(type) !== index);
    if (duplicatePendingType) {
      showFormError("Each uploaded document must use a unique document type. Change the document type before saving.");
      return;
    }

    try {
      const payload = { ...toPayload(), employeeCode };
      let savedEmployee: Employee;
      if (editing) {
        savedEmployee = await employeeApi.update(editing.id, payload);
      } else {
        savedEmployee = await employeeApi.create(payload);
        if (settings.codeMode === "AUTO") {
          setSettings((current) => ({ ...current, startingNumber: String((Number(current.startingNumber) || 0) + 1) }));
        }
      }
      if (form.deleteProfilePhoto && !form.profilePhotoFile) {
        await employeeApi.deleteProfilePhoto(savedEmployee.id).catch(() => undefined);
      }
      if (form.profilePhotoFile) {
        await employeeApi.uploadProfilePhoto(savedEmployee.id, form.profilePhotoFile, (progress) => {
          setFileMessage(`Uploading profile photo ${progress}%`);
        });
      }
      for (const document of form.documents.filter((item) => item.file)) {
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

  function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (settings.codeMode === "AUTO" && Number(settings.padding) <= 0) {
      setSettingsMessage("Number padding must be greater than zero.");
      return;
    }
    setSettingsMessage("Employee code configuration saved.");
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
    { header: "Salary", cell: (employee) => formatCurrency(employee.baseSalary) },
    { header: "Joined", cell: (employee) => formatDate(employee.joiningDate) },
    { header: "Status", cell: (employee) => <Badge value={employee.status} /> },
    {
      header: "Actions",
      cell: (employee) => (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="px-3" onClick={() => openEdit(employee)}>
            <Edit3 size={15} />
          </Button>
          <Button type="button" variant="danger" className="px-3" onClick={() => terminate(employee.id)}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">People</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Employees</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" className="px-3" onClick={() => setSettingsOpen(true)} aria-label="Employee settings">
              <Settings size={18} />
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus size={18} />
              New Employee
            </Button>
          </div>
        </div>

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
      </Card>

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

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Employee Settings"
        description="Reusable configuration area for employee-related setup."
      >
        <form onSubmit={saveSettings} className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <div className="rounded-3xl border border-moss/10 bg-white/70 p-4">
              <p className="text-sm font-extrabold text-ink">Employee Code</p>
              <p className="mt-2 text-sm leading-6 text-ink/55">More employee configuration groups can be added here later.</p>
            </div>
            <div className="space-y-4 rounded-3xl border border-moss/10 bg-white/70 p-4">
              <Select
                label="Employee Code Mode"
                value={settings.codeMode}
                onChange={(event) => setSettings({ ...settings, codeMode: event.target.value as EmployeeCodeMode })}
              >
                <option value="AUTO">Auto Generate</option>
                <option value="MANUAL">Manual Entry</option>
              </Select>
              {settings.codeMode === "AUTO" && (
                <>
                  <div className="grid gap-4 md:grid-cols-4">
                    <Input label="Prefix" value={settings.prefix} onChange={(event) => setSettings({ ...settings, prefix: event.target.value })} />
                    <Input label="Suffix" value={settings.suffix} onChange={(event) => setSettings({ ...settings, suffix: event.target.value })} />
                    <Input
                      label="Starting Number"
                      type="number"
                      min="0"
                      value={settings.startingNumber}
                      onChange={(event) => setSettings({ ...settings, startingNumber: event.target.value })}
                    />
                    <Input
                      label="Number Padding"
                      type="number"
                      min="1"
                      value={settings.padding}
                      onChange={(event) => setSettings({ ...settings, padding: event.target.value })}
                    />
                  </div>
                  <div className="rounded-3xl bg-oat/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Generated Code Preview</p>
                    <p className="mt-2 font-display text-2xl font-extrabold text-ink">{generatedCode}</p>
                    <p className="mt-1 text-sm font-semibold text-ink/55">{generatedPreview}</p>
                  </div>
                </>
              )}
              <p className="text-sm font-semibold text-ink/55">Employee Code uniqueness is validated before save.</p>
            </div>
          </div>
          {settingsMessage && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{settingsMessage}</p>}
          <div className="flex justify-end">
            <Button type="submit">Save Settings</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit employee" : "Create employee"}
        description="Employee data powers payroll, leave, shift, and reporting workflows."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              ref={errorAlertRef}
              role="alert"
              tabIndex={-1}
              className="sticky top-0 z-20 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm outline-none"
            >
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
              <span>{error}</span>
            </div>
          )}
          <Section title="Personal Information" defaultOpen>
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Employee Code"
                value={settings.codeMode === "AUTO" && !editing ? generatedCode : form.employeeCode}
                disabled={Boolean(editing) || (settings.codeMode === "AUTO" && !editing)}
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
              <div className="space-y-2 text-sm font-semibold text-ink/80">
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
              </div>
            </div>
          </Section>

          <Section title="Employment Information">
            <div className="grid gap-4 md:grid-cols-3">
              <SearchableSelect
                label="Employment Type"
                value={form.employmentType}
                options={employmentTypeOptions}
                onChange={(value) => setForm({ ...form, employmentType: value })}
              />
              <SearchableSelect
                label="Department"
                value={String(form.departmentId || "")}
                options={departmentOptions}
                onChange={(value) => updateDepartment(Number(value))}
              />
              <SearchableSelect
                label="Designation"
                value={String(form.designationId || "")}
                options={designationOptions}
                onChange={(value) => setForm({ ...form, designationId: Number(value) })}
              />
              <SearchableSelect
                label="Branch"
                value={form.branch}
                options={branchOptions}
                onChange={(value) => setForm({ ...form, branch: value })}
              />
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
              <Input label="Date of Joining" type="date" value={form.joiningDate} onChange={(event) => setForm({ ...form, joiningDate: event.target.value })} />
              <Input label="Confirmation Date" type="date" value={form.confirmationDate} onChange={(event) => setForm({ ...form, confirmationDate: event.target.value })} />
              <Input label="Probation Period" value={form.probationPeriod} onChange={(event) => setForm({ ...form, probationPeriod: event.target.value })} />
              <SearchableSelect
                label="Employee Status"
                value={form.status}
                options={statusOptions}
                onChange={(value) => setForm({ ...form, status: value as EmploymentStatus })}
              />
              <Input label="Biometric ID" value={form.biometricId} onChange={(event) => setForm({ ...form, biometricId: event.target.value })} />
              <Input label="Base Salary" type="number" min="1" value={form.baseSalary} onChange={(event) => setForm({ ...form, baseSalary: event.target.value })} />
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

          {form.status === "TERMINATED" && (
            <Section title="Exit Information">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Resignation Date" type="date" value={form.resignationDate} onChange={(event) => setForm({ ...form, resignationDate: event.target.value })} />
                <Input label="Last Working Date" type="date" value={form.lastWorkingDate} onChange={(event) => setForm({ ...form, lastWorkingDate: event.target.value })} />
                <Input label="Relieving Date" type="date" value={form.relievingDate} onChange={(event) => setForm({ ...form, relievingDate: event.target.value })} />
                <Textarea label="Exit Reason" value={form.exitReason} onChange={(event) => setForm({ ...form, exitReason: event.target.value })} />
              </div>
            </Section>
          )}

          <div className="sticky bottom-0 flex justify-end gap-3 border-t border-moss/10 bg-shell/95 py-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save changes" : "Create employee"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
