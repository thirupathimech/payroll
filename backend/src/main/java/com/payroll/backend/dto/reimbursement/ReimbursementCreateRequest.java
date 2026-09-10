package com.payroll.backend.dto.reimbursement;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ReimbursementCreateRequest(
        Long employeeId,
        @NotNull LocalDate expenseDate,
        @NotBlank @Size(max = 80) String category,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotBlank @Size(max = 1200) String description
) { }
