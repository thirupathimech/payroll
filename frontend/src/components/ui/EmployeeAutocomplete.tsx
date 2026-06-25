import { SearchableSelect } from "./SearchableSelect";

export interface EmployeeAutocompleteOption {
  employeeCode: string;
  fullName: string;
  designationTitle?: string;
  departmentName?: string;
}

interface EmployeeAutocompleteProps {
  label?: string;
  value: string;
  employees: EmployeeAutocompleteOption[];
  onChange: (employeeCode: string) => void;
  placeholder?: string;
}

export function EmployeeAutocomplete({
  label = "Employee",
  value,
  employees,
  onChange,
  placeholder = "Search by code, name, designation, or department",
}: EmployeeAutocompleteProps) {
  return (
    <SearchableSelect
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      options={employees.map((employee) => ({
        value: employee.employeeCode,
        label: `${employee.employeeCode} - ${employee.fullName}`,
        searchText: `${employee.employeeCode} ${employee.fullName} ${employee.designationTitle ?? ""} ${employee.departmentName ?? ""}`,
      }))}
      renderOption={(option) => {
        const employee = employees.find((item) => item.employeeCode === option.value);
        if (!employee) {
          return option.label;
        }
        return (
          <span className="block">
            <span className="block font-bold">
              {employee.employeeCode} | {employee.fullName}
            </span>
            <span className="block text-xs opacity-75">{employee.designationTitle ?? "Designation not set"}</span>
            <span className="block text-xs opacity-75">{employee.departmentName ?? "Department not set"}</span>
          </span>
        );
      }}
    />
  );
}
