package com.payroll.backend.dto.salary;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record EmployeeSalaryRequest(
        @NotNull @DecimalMin(value = "0.01") @Digits(integer = 12, fraction = 2) BigDecimal ctc,
        @Valid List<EmployeeSalaryComponentRequest> components,
        SalaryUpdateMode updateMode,
        LocalDate effectiveDate,
        @jakarta.validation.constraints.Size(max = 600) String reason
) {
}
