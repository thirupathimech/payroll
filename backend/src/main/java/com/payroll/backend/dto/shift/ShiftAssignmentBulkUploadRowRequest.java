package com.payroll.backend.dto.shift;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ShiftAssignmentBulkUploadRowRequest(
        @NotBlank(message = "Employee Code is required") String employeeCode,
        @NotBlank(message = "Shift Code is required") String shiftCode,
        @NotNull(message = "From Date is required") LocalDate startDate,
        @NotNull(message = "To Date is required") LocalDate endDate
) {
}
