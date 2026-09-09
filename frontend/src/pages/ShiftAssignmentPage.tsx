import { FormEvent, type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Download, FileSpreadsheet, RotateCcw, Save, Search, Trash2, UploadCloud } from "lucide-react";
import { getApiError, getErrorMessage } from "../api/client";
import { departmentApi, employeeApi, shiftApi, shiftAssignmentApi } from "../api/payroll";
import { useAuth } from "../auth/AuthContext";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmployeeAutocomplete } from "../components/ui/EmployeeAutocomplete";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { formatDate } from "../lib/format";
import type { Department, Employee, Shift, ShiftAssignment } from "../types";

interface EmployeeOption {
  id: number;
  employeeCode: string;
  fullName: string;
  designationTitle: string;
  departmentId: number;
  departmentName: string;
}

interface AssignmentForm {
  employeeId: string;
  shiftId: string;
  startDate: string;
  endDate: string;
}

interface PendingSave {
  form: AssignmentForm;
  dates: string[];
  conflicts: ShiftAssignment[];
}

interface AssignmentDetailsMenu {
  assignment: ShiftAssignment;
  x: number;
  y: number;
}

interface ShiftUploadRow {
  id: number;
  line: number;
  employeeCode: string;
  employeeName: string;
  shiftCode: string;
  shiftName: string;
  startDate: string;
  endDate: string;
  errors: string[];
}

const initialDepartments: Department[] = [];

const initialEmployees: EmployeeOption[] = [];

const initialAssignments: ShiftAssignment[] = [];

const initialForm: AssignmentForm = {
  employeeId: "",
  shiftId: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const shiftUploadConflictFieldPrefix = "employeeCode:";
const shiftUploadConflictMessage = "Existing shift assignment found for one or more selected dates. Enable overwrite to replace it.";

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function addDays(dateKey: string, amount: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

function eachDateInRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  let current = startDate;

  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function toClockLabel(time: string, durationHours = 0, durationMinutes = 0) {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationHours * 60 + durationMinutes;
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}${totalMinutes >= 1440 ? " (Next Day)" : ""}`;
}

function shiftTone(index: number) {
  const tones = [
    "bg-emerald-100 text-emerald-800 border-emerald-200",
    "bg-amber-100 text-amber-800 border-amber-200",
    "bg-lagoon/10 text-lagoon border-lagoon/20",
    "bg-oat text-ink border-moss/10",
  ];
  return tones[index % tones.length];
}

function employeeToOption(employee: Employee): EmployeeOption {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    designationTitle: employee.designationTitle,
    departmentId: employee.departmentId,
    departmentName: employee.departmentName,
  };
}

function sheetCellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return toDateKey(value);
  if (typeof value === "object" && value && "result" in value) {
    return sheetCellText((value as { result: unknown }).result);
  }
  if (typeof value === "object" && value && "text" in value) {
    return String((value as { text: unknown }).text ?? "").trim();
  }
  return String(value).trim();
}

function sheetHeaderKey(value: string) {
  return value.toLowerCase().replace(/[\s_-]+/g, "");
}

function isValidSheetDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toDateKey(parseDateKey(value)) === value;
}

function buildCalendarDays(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const calendarStart = new Date(firstOfMonth);
  calendarStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return {
      date,
      dateKey: toDateKey(date),
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

export function ShiftAssignmentPage() {
  const { viewMode } = useAuth();
  const isPersonnelMode = viewMode === "personnel";
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [employees, setEmployees] = useState<EmployeeOption[]>(initialEmployees);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [assignments, setAssignments] = useState<ShiftAssignment[]>(initialAssignments);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const [form, setForm] = useState<AssignmentForm>(initialForm);
  const [error, setError] = useState("");
  const [assignmentDetailsMenu, setAssignmentDetailsMenu] = useState<AssignmentDetailsMenu | null>(null);
  const shiftUploadInputRef = useRef<HTMLInputElement>(null);
  const [shiftUploadFile, setShiftUploadFile] = useState<File>();
  const [shiftUploadRows, setShiftUploadRows] = useState<ShiftUploadRow[]>([]);
  const [overwriteUploadedShifts, setOverwriteUploadedShifts] = useState(false);
  const [validatingShiftUpload, setValidatingShiftUpload] = useState(false);
  const [savingShiftUpload, setSavingShiftUpload] = useState(false);
  const [shiftUploadError, setShiftUploadError] = useState("");
  const [shiftUploadMessage, setShiftUploadMessage] = useState("");

  useEffect(() => {
    Promise.all([
      departmentApi.active(),
      isPersonnelMode ? employeeApi.me().then((employee) => ({ content: [employee] })) : employeeApi.search({ status: "ACTIVE", page: 0, size: 500 }),
      shiftApi.active(),
    ])
      .then(([departmentItems, employeePage, shiftItems]) => {
        if (departmentItems.length > 0) {
          setDepartments(departmentItems);
        }
        setShifts(shiftItems);

        if (employeePage.content.length > 0) {
          const nextEmployees = employeePage.content.map(employeeToOption);
          setEmployees(nextEmployees);
          setSelectedEmployeeId((current) => current || String(nextEmployees[0]?.id ?? ""));
          setSelectedEmployeeCode((current) => current || nextEmployees[0]?.employeeCode || "");
          setForm((current) => ({
            ...current,
            employeeId: current.employeeId || String(nextEmployees[0]?.id ?? ""),
          }));
        }
      })
      .catch(() => undefined);
  }, [isPersonnelMode]);

  const visibleEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const matchesDepartment = !departmentFilter || employee.departmentId === Number(departmentFilter);
        const query = employeeSearch.trim().toLowerCase();
        const matchesSearch =
          !query ||
          employee.fullName.toLowerCase().includes(query) ||
          employee.employeeCode.toLowerCase().includes(query);

        return matchesDepartment && matchesSearch;
      }),
    [departmentFilter, employeeSearch, employees],
  );

  useEffect(() => {
    if (visibleEmployees.length > 0 && !visibleEmployees.some((employee) => String(employee.id) === selectedEmployeeId)) {
      setSelectedEmployeeId(String(visibleEmployees[0].id));
      setSelectedEmployeeCode(visibleEmployees[0].employeeCode);
    }
  }, [selectedEmployeeId, visibleEmployees]);

  const selectedEmployee = employees.find((employee) => employee.id === Number(selectedEmployeeId));
  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const calendarStart = calendarDays[0]?.dateKey;
  const calendarEnd = calendarDays[calendarDays.length - 1]?.dateKey;
  const selectedEmployeeAssignments = useMemo(
    () => assignments.filter((assignment) => String(assignment.employeeId) === selectedEmployeeId),
    [assignments, selectedEmployeeId],
  );

  const loadAssignments = useCallback((employeeId = selectedEmployeeId, startDate = calendarStart, endDate = calendarEnd) => {
    if (!employeeId || !startDate || !endDate) {
      setAssignments([]);
      return;
    }
    shiftAssignmentApi
      .search({ employeeId: Number(employeeId), startDate, endDate })
      .then(setAssignments)
      .catch((apiError) => setError(getErrorMessage(apiError)));
  }, [calendarEnd, calendarStart, selectedEmployeeId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    if (!assignmentDetailsMenu) {
      return undefined;
    }

    function closeDetailsMenu() {
      setAssignmentDetailsMenu(null);
    }

    window.addEventListener("click", closeDetailsMenu);
    window.addEventListener("scroll", closeDetailsMenu, true);
    window.addEventListener("resize", closeDetailsMenu);

    return () => {
      window.removeEventListener("click", closeDetailsMenu);
      window.removeEventListener("scroll", closeDetailsMenu, true);
      window.removeEventListener("resize", closeDetailsMenu);
    };
  }, [assignmentDetailsMenu]);

  function openAssignmentDialog(dateKey: string) {
    if (isPersonnelMode) {
      return;
    }
    setForm({
      employeeId: selectedEmployeeId,
      shiftId: shifts[0] ? String(shifts[0].id) : "",
      startDate: dateKey,
      endDate: dateKey,
    });
    setError("");
    setDialogOpen(true);
  }

  function chooseEmployee(employeeCode: string) {
    const employee = employees.find((item) => item.employeeCode === employeeCode);
    setSelectedEmployeeCode(employeeCode);
    setSelectedEmployeeId(employee ? String(employee.id) : "");
    setForm((current) => ({ ...current, employeeId: employee ? String(employee.id) : "" }));
  }

  function closeAssignmentDialog() {
    setDialogOpen(false);
    setError("");
  }

  function moveMonth(amount: number) {
    setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function showAssignmentDetails(event: MouseEvent, assignment: ShiftAssignment) {
    event.preventDefault();
    event.stopPropagation();
    setAssignmentDetailsMenu({
      assignment,
      x: Math.min(event.clientX, window.innerWidth - 288),
      y: Math.min(event.clientY, window.innerHeight - 288),
    });
  }

  async function commitAssignments(nextForm: AssignmentForm, overrideExisting: boolean) {
    await shiftAssignmentApi.create({
      employeeId: Number(nextForm.employeeId),
      shiftId: Number(nextForm.shiftId),
      startDate: nextForm.startDate,
      endDate: nextForm.endDate,
      overrideExisting,
    });
    setCurrentMonth(parseDateKey(nextForm.startDate));
    setSelectedEmployeeId(nextForm.employeeId);
    setSelectedEmployeeCode(employees.find((item) => String(item.id) === nextForm.employeeId)?.employeeCode || "");
    setDialogOpen(false);
    setWarningOpen(false);
    setPendingSave(null);
    setError("");
    loadAssignments(nextForm.employeeId);
  }

  async function saveAssignment(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!form.employeeId || !form.shiftId) {
      setError("Employee and shift are required.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      setError("Start Date and End Date are required.");
      return;
    }

    if (form.endDate < form.startDate) {
      setError("End Date cannot be before Start Date.");
      return;
    }

    const dates = eachDateInRange(form.startDate, form.endDate);
    const conflicts = assignments.filter(
      (assignment) => assignment.employeeId === Number(form.employeeId) && dates.includes(assignment.date),
    );

    if (conflicts.length > 0) {
      setPendingSave({ form: { ...form }, dates, conflicts });
      setWarningOpen(true);
      return;
    }

    try {
      await commitAssignments(form, false);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  async function confirmOverride() {
    if (!pendingSave) {
      return;
    }

    try {
      await commitAssignments(pendingSave.form, true);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  function cancelOverride() {
    setWarningOpen(false);
    setPendingSave(null);
  }

  function clearShiftUploadPreview() {
    setShiftUploadRows([]);
    setShiftUploadError("");
    setShiftUploadMessage("");
  }

  async function downloadShiftUploadTemplate() {
    setShiftUploadError("");
    try {
      const [employeePage, activeShifts, excelModule] = await Promise.all([
        employeeApi.search({ status: "ACTIVE", page: 0, size: 1000 }),
        shiftApi.active(),
        import("exceljs"),
      ]);
      const employeeCodes = [...new Set(employeePage.content.map((employee) => employee.employeeCode.trim()).filter(Boolean))]
        .sort((left, right) => left.localeCompare(right));
      const shiftCodes = [...new Set(activeShifts.map((shift) => shift.code.trim()).filter(Boolean))]
        .sort((left, right) => left.localeCompare(right));
      if (!employeeCodes.length || !shiftCodes.length) {
        setShiftUploadError("Add at least one active employee and active shift before downloading the template.");
        return;
      }

      const ExcelJS = excelModule.default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Shift Upload");
      const dropdownValues = workbook.addWorksheet("Dropdown Values");
      sheet.columns = [
        { header: "Employee Code", key: "employeeCode", width: 24 },
        { header: "Shift Code", key: "shiftCode", width: 20 },
        { header: "From Date", key: "startDate", width: 16 },
        { header: "To Date", key: "endDate", width: 16 },
      ];
      dropdownValues.columns = [
        { header: "Employee Code", key: "employeeCode", width: 24 },
        { header: "Shift Code", key: "shiftCode", width: 20 },
      ];
      const dropdownRowCount = Math.max(employeeCodes.length, shiftCodes.length);
      for (let index = 0; index < dropdownRowCount; index += 1) {
        dropdownValues.addRow({ employeeCode: employeeCodes[index] ?? "", shiftCode: shiftCodes[index] ?? "" });
      }
      workbook.definedNames.add(`'Dropdown Values'!$A$2:$A$${employeeCodes.length + 1}`, "ShiftUploadEmployeeCodes");
      workbook.definedNames.add(`'Dropdown Values'!$B$2:$B$${shiftCodes.length + 1}`, "ShiftUploadShiftCodes");

      for (let index = 0; index < 250; index += 1) {
        sheet.addRow({ employeeCode: "", shiftCode: "", startDate: "", endDate: "" });
      }
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF214E45" } };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.autoFilter = { from: "A1", to: "D1" };
      for (let row = 2; row <= 251; row += 1) {
        sheet.getCell(row, 1).dataValidation = {
          type: "list",
          allowBlank: false,
          formulae: ["=ShiftUploadEmployeeCodes"],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Invalid employee",
          error: "Choose an Employee Code from the dropdown.",
        };
        sheet.getCell(row, 2).dataValidation = {
          type: "list",
          allowBlank: false,
          formulae: ["=ShiftUploadShiftCodes"],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Invalid shift",
          error: "Choose a Shift Code from the dropdown.",
        };
        sheet.getCell(row, 3).numFmt = "yyyy-mm-dd";
        sheet.getCell(row, 4).numFmt = "yyyy-mm-dd";
      }
      dropdownValues.state = "hidden";

      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = "employee-shift-upload-template.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (apiError) {
      setShiftUploadError(getErrorMessage(apiError));
    }
  }

  async function readShiftUploadRows(file: File) {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      throw new Error("Use the XLSX shift upload template.");
    }

    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.getWorksheet("Shift Upload") ?? workbook.worksheets[0];
    if (!sheet) throw new Error("The upload does not contain a worksheet.");

    const columnPositions = new Map<string, number>();
    for (let column = 1; column <= sheet.columnCount; column += 1) {
      const key = sheetHeaderKey(sheetCellText(sheet.getRow(1).getCell(column).value));
      if (key === "employeecode") columnPositions.set("employeeCode", column);
      if (key === "shiftcode") columnPositions.set("shiftCode", column);
      if (key === "fromdate" || key === "startdate") columnPositions.set("startDate", column);
      if (key === "todate" || key === "enddate") columnPositions.set("endDate", column);
    }
    const requiredColumns = [
      { key: "employeeCode", label: "Employee Code" },
      { key: "shiftCode", label: "Shift Code" },
      { key: "startDate", label: "From Date" },
      { key: "endDate", label: "To Date" },
    ];
    const missingColumns = requiredColumns.filter((column) => !columnPositions.has(column.key)).map((column) => column.label);
    if (missingColumns.length) {
      throw new Error(`The upload is missing: ${missingColumns.join(", ")}.`);
    }

    const rows: Array<{ line: number; employeeCode: string; shiftCode: string; startDate: string; endDate: string }> = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const employeeCode = sheetCellText(row.getCell(columnPositions.get("employeeCode") as number).value).replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
      const shiftCode = sheetCellText(row.getCell(columnPositions.get("shiftCode") as number).value).replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
      const startDate = sheetCellText(row.getCell(columnPositions.get("startDate") as number).value).trim();
      const endDate = sheetCellText(row.getCell(columnPositions.get("endDate") as number).value).trim();
      if (employeeCode || shiftCode || startDate || endDate) rows.push({ line: rowNumber, employeeCode, shiftCode, startDate, endDate });
    });
    if (!rows.length) throw new Error("The upload file has no shift rows.");
    if (rows.length > 500) throw new Error("Upload up to 500 shift rows at a time.");
    return rows;
  }

  async function validateShiftUpload() {
    if (!shiftUploadFile) {
      setShiftUploadError("Choose the completed shift upload sheet first.");
      return;
    }
    setValidatingShiftUpload(true);
    clearShiftUploadPreview();
    try {
      const sourceRows = await readShiftUploadRows(shiftUploadFile);
      const employeesByCode = new Map(employees.map((employee) => [employee.employeeCode.trim().toUpperCase(), employee]));
      const shiftsByCode = new Map(shifts.map((shift) => [shift.code.trim().toUpperCase(), shift]));
      const uploadedEmployeeCodes = new Set<string>();
      const preview = sourceRows.map(({ line, employeeCode: rawEmployeeCode, shiftCode: rawShiftCode, startDate, endDate }, index): ShiftUploadRow => {
        const employeeCode = rawEmployeeCode.toUpperCase();
        const shiftCode = rawShiftCode.toUpperCase();
        const employee = employeesByCode.get(employeeCode);
        const shift = shiftsByCode.get(shiftCode);
        const errors: string[] = [];
        if (!employeeCode) errors.push("Employee Code is required.");
        else if (uploadedEmployeeCodes.has(employeeCode)) errors.push("Employee Code is repeated in this upload.");
        uploadedEmployeeCodes.add(employeeCode);
        if (!shiftCode) errors.push("Shift Code is required.");
        if (!startDate) errors.push("From Date is required.");
        else if (!isValidSheetDate(startDate)) errors.push("From Date must be a valid YYYY-MM-DD date.");
        if (!endDate) errors.push("To Date is required.");
        else if (!isValidSheetDate(endDate)) errors.push("To Date must be a valid YYYY-MM-DD date.");
        else if (isValidSheetDate(startDate) && endDate < startDate) errors.push("To Date cannot be before From Date.");

        return {
          id: index + 1,
          line,
          employeeCode,
          employeeName: employee?.fullName ?? "Checked when saved",
          shiftCode,
          shiftName: shift?.name ?? "Checked when saved",
          startDate,
          endDate,
          errors,
        };
      });
      setShiftUploadRows(preview);
      const invalidRows = preview.filter((row) => row.errors.length).length;
      setShiftUploadMessage(
        invalidRows
          ? `${preview.length - invalidRows} of ${preview.length} row(s) are ready. Fix the highlighted rows before saving.`
          : `${preview.length} row(s) are ready. Review the upload, then save the assignments.`,
      );
    } catch (apiError) {
      setShiftUploadError(apiError instanceof Error ? apiError.message : getErrorMessage(apiError));
    } finally {
      setValidatingShiftUpload(false);
    }
  }

  async function saveShiftUpload() {
    if (!shiftUploadRows.length) {
      setShiftUploadError("Validate a shift upload before saving.");
      return;
    }
    if (shiftUploadRows.some((row) => row.errors.length)) {
      setShiftUploadError("Fix all highlighted upload rows before saving.");
      return;
    }

    setSavingShiftUpload(true);
    setShiftUploadError("");
    try {
      const result = await shiftAssignmentApi.bulkCreate({
        overrideExisting: overwriteUploadedShifts,
        assignments: shiftUploadRows.map((row) => ({
          employeeCode: row.employeeCode,
          shiftCode: row.shiftCode,
          startDate: row.startDate,
          endDate: row.endDate,
        })),
      });
      setShiftUploadMessage(
        `${result.savedAssignments} shift assignment day(s) saved for ${result.uploadedRows} employee(s)${
          result.replacedAssignments ? `; ${result.replacedAssignments} existing assignment(s) replaced.` : "."
        }`,
      );
      setShiftUploadRows([]);
      setShiftUploadFile(undefined);
      if (shiftUploadInputRef.current) shiftUploadInputRef.current.value = "";
      loadAssignments();
    } catch (apiError) {
      const apiDetails = getApiError(apiError);
      const conflictFieldErrors = apiDetails.fieldErrors ?? {};
      const conflictingEmployeeCodes = new Set(
        Object.keys(conflictFieldErrors)
          .filter((key) => key.startsWith(shiftUploadConflictFieldPrefix))
          .map((key) => key.slice(shiftUploadConflictFieldPrefix.length)),
      );
      if (conflictingEmployeeCodes.size) {
        setShiftUploadRows((current) => current.map((row) => {
          if (!conflictingEmployeeCodes.has(row.employeeCode)) return row;
          const rowError = conflictFieldErrors[`${shiftUploadConflictFieldPrefix}${row.employeeCode}`] || shiftUploadConflictMessage;
          return {
            ...row,
            errors: row.errors.includes(rowError) ? row.errors : [...row.errors, rowError],
          };
        }));
        setShiftUploadMessage("");
        setShiftUploadError(apiDetails.message);
      } else {
        setShiftUploadError(apiDetails.message);
      }
    } finally {
      setSavingShiftUpload(false);
    }
  }

  async function removeAssignment(assignment: ShiftAssignment) {
    if (isPersonnelMode) {
      return;
    }
    if (!window.confirm(`Remove ${assignment.shiftName} for ${assignment.employeeName} on ${formatDate(assignment.date)}?`)) {
      return;
    }

    try {
      await shiftAssignmentApi.delete(assignment.id);
      loadAssignments();
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    }
  }

  const upcomingAssignments = selectedEmployeeAssignments
    .filter((assignment) => assignment.date >= toDateKey(new Date()))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Card className="relative z-30 overflow-visible">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">
              {isPersonnelMode ? "Personnel" : "Attendance Setup"}
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">
              {isPersonnelMode ? "My Shift" : "Shift Assignment"}
            </h2>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ember text-ink shadow-glow">
            <CalendarDays size={22} />
          </div>
        </div>

        {!isPersonnelMode && (
          <div className="mt-6 grid gap-3 lg:grid-cols-[220px_1fr_280px]">
            <SearchableSelect
              aria-label="Filter by department"
              value={departmentFilter}
              options={[{ value: "", label: "All departments" }, ...departments.map((department) => ({ value: String(department.id), label: department.name, searchText: department.code }))]}
              onChange={setDepartmentFilter}
            />
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
              <Input
                aria-label="Employee search"
                placeholder="Search by employee name or ID"
                className="pl-11"
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
              />
            </div>
            <EmployeeAutocomplete
              label=""
              value={selectedEmployeeCode}
              employees={visibleEmployees}
              onChange={chooseEmployee}
              placeholder="Select employee schedule"
            />
          </div>
        )}
      </Card>

      <section className="relative z-10 grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-4 border-b border-moss/10 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Schedule</p>
              <h3 className="mt-1 font-display text-2xl font-extrabold text-ink">{monthLabel(currentMonth)}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="px-3" onClick={() => moveMonth(-1)} aria-label="Previous month">
                <ChevronLeft size={17} />
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCurrentMonth(new Date())}>
                <RotateCcw size={16} />
                Today
              </Button>
              <Button type="button" variant="secondary" className="px-3" onClick={() => moveMonth(1)} aria-label="Next month">
                <ChevronRight size={17} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-moss/10 bg-moss/5">
            {weekdayLabels.map((day) => (
              <div key={day} className="px-3 py-3 text-center text-xs font-extrabold uppercase tracking-[0.14em] text-ink/55">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dayAssignments = selectedEmployeeAssignments.filter((assignment) => assignment.date === day.dateKey);
              const isToday = day.dateKey === toDateKey(new Date());

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  className={`min-h-[108px] border-b border-r border-moss/10 p-2 text-left transition hover:bg-fern/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-fern/30 ${
                    day.inCurrentMonth ? "bg-white/60" : "bg-oat/35 text-ink/35"
                  }`}
                  onClick={() => openAssignmentDialog(day.dateKey)}
                  aria-disabled={isPersonnelMode}
                >
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-sm font-extrabold ${
                      isToday ? "bg-moss text-white" : "text-ink/70"
                    }`}
                  >
                    {day.date.getDate()}
                  </span>
                  <div className="mt-2 space-y-1">
                    {dayAssignments.map((assignment) => {
                      const shiftIndex = shifts.findIndex((item) => item.id === assignment.shiftId);
                      return (
                        <span
                          key={assignment.id}
                          className={`block truncate rounded-xl border px-2 py-1 text-xs font-bold ${
                            shiftIndex >= 0 ? shiftTone(shiftIndex) : "border-slate-200 bg-slate-100 text-slate-700"
                          }`}
                          onContextMenu={(event) => showAssignmentDetails(event, assignment)}
                        >
                          {assignment.shiftCode} - {assignment.shiftName}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Employee</p>
            <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">
              {selectedEmployee?.fullName ?? "No employee selected"}
            </h3>
            <p className="mt-1 text-sm font-semibold text-ink/55">
              {selectedEmployee ? `${selectedEmployee.employeeCode} - ${selectedEmployee.departmentName}` : "-"}
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-3xl bg-oat/70 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Assigned Days</p>
              <p className="mt-3 font-display text-3xl font-extrabold text-ink">{selectedEmployeeAssignments.length}</p>
            </div>
            <div className="rounded-3xl bg-lagoon/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Calendar Rule</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">Only one shift is allowed per employee per day.</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Upcoming</p>
            <div className="mt-3 space-y-3">
              {upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-start justify-between gap-3 rounded-3xl border border-moss/10 bg-white/70 p-4">
                  <div>
                    <p className="font-bold text-ink">{assignment.shiftName}</p>
                    <p className="text-sm text-ink/55">{formatDate(assignment.date)}</p>
                  </div>
                  {!isPersonnelMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 w-9 rounded-full p-0 text-red-700 hover:bg-red-50"
                      onClick={() => removeAssignment(assignment)}
                      aria-label="Remove assignment"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              ))}
              {upcomingAssignments.length === 0 && (
                <p className="rounded-3xl bg-white/70 p-4 text-sm font-semibold text-ink/55">No upcoming shifts.</p>
              )}
            </div>
          </div>
        </Card>
      </section>

      {!isPersonnelMode && (
        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Bulk schedule</p>
              <h3 className="mt-2 font-display text-xl font-extrabold text-ink">Employee shift uploader</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/60">
                Upload one row per employee with <span className="font-bold">Employee Code</span>, <span className="font-bold">Shift Code</span>, <span className="font-bold">From Date</span>, and <span className="font-bold">To Date</span>.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={downloadShiftUploadTemplate}>
              <Download size={17} />
              Download template
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <input
              ref={shiftUploadInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(event) => {
                setShiftUploadFile(event.target.files?.[0]);
                clearShiftUploadPreview();
              }}
            />
            <Button type="button" variant="secondary" onClick={() => shiftUploadInputRef.current?.click()} disabled={savingShiftUpload}>
              <UploadCloud size={17} />
              Choose completed sheet
            </Button>
            <span className="min-w-0 max-w-sm truncate text-sm font-semibold text-ink/60">
              {shiftUploadFile ? shiftUploadFile.name : "No file selected"}
            </span>
            <label className="flex min-h-[42px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink/80">
              <input
                type="checkbox"
                checked={overwriteUploadedShifts}
                onChange={(event) => {
                  setOverwriteUploadedShifts(event.target.checked);
                  clearShiftUploadPreview();
                }}
                className="h-4 w-4 rounded border-line text-moss focus:ring-fern"
              />
              Overwrite existing assignments
            </label>
            <Button type="button" onClick={validateShiftUpload} disabled={!shiftUploadFile || validatingShiftUpload || savingShiftUpload}>
              <FileSpreadsheet size={17} />
              {validatingShiftUpload ? "Preparing preview..." : "Preview upload"}
            </Button>
          </div>

          <p className="mt-4 rounded-2xl bg-oat/70 px-4 py-3 text-sm font-semibold leading-6 text-ink/65">
            Each employee's date range comes from their own sheet row. If any date already has a shift, saving is blocked unless <span className="font-bold text-ink">Overwrite existing assignments</span> is enabled. No part of the sheet is saved on an error.
          </p>
          {shiftUploadError && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{shiftUploadError}</p>}
          {shiftUploadMessage && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{shiftUploadMessage}</p>}
        </Card>
      )}

      {!isPersonnelMode && shiftUploadRows.length > 0 && (
        <Card className="overflow-hidden border-2 border-fern/20 p-0">
          <div className="flex flex-col gap-3 border-b border-moss/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Review before saving</p>
              <h3 className="mt-1 font-display text-xl font-extrabold text-ink">Shift upload preview</h3>
              <p className="mt-1 text-sm text-ink/60">Review each employee's own date range before saving.</p>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={clearShiftUploadPreview} disabled={savingShiftUpload}>
                Clear
              </Button>
              <Button type="button" onClick={saveShiftUpload} disabled={shiftUploadRows.some((row) => row.errors.length) || savingShiftUpload}>
                <Save size={17} />
                {savingShiftUpload ? "Saving..." : "Save upload"}
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-moss/5 text-xs font-extrabold uppercase tracking-[0.14em] text-ink/55">
                <tr>
                  <th className="px-5 py-3">Line</th>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Shift</th>
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-moss/10">
                {shiftUploadRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3 font-semibold">{row.line}</td>
                    <td className="px-5 py-3"><p className="font-bold text-ink">{row.employeeCode || "-"}</p><p className="text-xs text-ink/55">{row.employeeName}</p></td>
                    <td className="px-5 py-3"><p className="font-bold text-ink">{row.shiftCode || "-"}</p><p className="text-xs text-ink/55">{row.shiftName}</p></td>
                    <td className="px-5 py-3 text-ink/70">{isValidSheetDate(row.startDate) ? formatDate(row.startDate) : row.startDate || "-"} - {isValidSheetDate(row.endDate) ? formatDate(row.endDate) : row.endDate || "-"}</td>
                    <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.errors.length ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{row.errors.length ? "Error" : "Ready"}</span></td>
                    <td className="px-5 py-3 text-xs font-semibold text-red-700">{row.errors.join(" ") || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {assignmentDetailsMenu && (
        <div
          className="fixed z-[70] w-72 rounded-2xl border border-moss/10 bg-white p-4 text-sm shadow-card"
          style={{ left: assignmentDetailsMenu.x, top: assignmentDetailsMenu.y }}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-label="Shift details"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Shift Details</p>
          <h3 className="mt-2 font-display text-lg font-extrabold text-ink">{assignmentDetailsMenu.assignment.shiftName}</h3>
          <div className="mt-3 space-y-2 text-ink/70">
            <p>
              <span className="font-bold text-ink">Code:</span> {assignmentDetailsMenu.assignment.shiftCode}
            </p>
            <p>
              <span className="font-bold text-ink">Date:</span> {formatDate(assignmentDetailsMenu.assignment.date)}
            </p>
            <p>
              <span className="font-bold text-ink">Employee:</span> {assignmentDetailsMenu.assignment.employeeName}
            </p>
            <p>
              <span className="font-bold text-ink">Personnel Type:</span> {assignmentDetailsMenu.assignment.employmentType || "-"}
            </p>
            <p>
              <span className="font-bold text-ink">Department:</span> {assignmentDetailsMenu.assignment.departmentName}
            </p>
            <p>
              <span className="font-bold text-ink">Time:</span>{" "}
              {assignmentDetailsMenu.assignment.startTime} to{" "}
              {toClockLabel(
                assignmentDetailsMenu.assignment.startTime,
                assignmentDetailsMenu.assignment.durationHours,
                assignmentDetailsMenu.assignment.durationMinutes,
              )}
            </p>
            <p>
              <span className="font-bold text-ink">Duration:</span> {assignmentDetailsMenu.assignment.durationHours}h{" "}
              {assignmentDetailsMenu.assignment.durationMinutes}m
            </p>
          </div>
        </div>
      )}

      {!isPersonnelMode && <Modal
        open={dialogOpen}
        onClose={closeAssignmentDialog}
        title="Shift Assignment"
        description="Select a shift and date range. Each calendar day is stored as a separate assignment."
      >
        <form onSubmit={saveAssignment} className="space-y-4">
          <EmployeeAutocomplete
            label="Employee"
            value={employees.find((employee) => String(employee.id) === form.employeeId)?.employeeCode || selectedEmployeeCode}
            employees={visibleEmployees}
            onChange={chooseEmployee}
          />

          <SearchableSelect
              label="Shift"
              value={form.shiftId}
            options={shifts.map((shift) => ({
              value: String(shift.id),
              label: `${shift.name} (${shift.startTime} to ${toClockLabel(shift.startTime, shift.durationHours, shift.durationMinutes)})`,
              searchText: shift.code,
            }))}
            onChange={(value) => setForm({ ...form, shiftId: value })}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Start Date"
              type="date"
              required
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              required
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
            />
          </div>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeAssignmentDialog}>
              Cancel
            </Button>
            <Button type="submit">Save Assignment</Button>
          </div>
        </form>
      </Modal>}

      {warningOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl animate-rise rounded-[2rem] bg-shell p-6 shadow-card">
            <div className="mb-5">
              <Badge value="Override Required" />
              <h3 className="mt-4 font-display text-2xl font-extrabold text-ink">Existing shift assignment found</h3>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                One or more selected dates already have shift assignments for this employee. Do you want to override the existing assignment(s)?
              </p>
            </div>

            {pendingSave && (
              <div className="mb-5 max-h-44 overflow-auto rounded-3xl border border-moss/10 bg-white/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Conflicting Dates</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pendingSave.conflicts.map((conflict) => (
                    <span key={conflict.id} className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                      {formatDate(conflict.date)} - {conflict.shiftName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={cancelOverride}>
                No
              </Button>
              <Button type="button" onClick={confirmOverride}>
                Yes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
