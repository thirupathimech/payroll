package com.payroll.backend.dto.transfer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record EmployeeTransferCreateRequest(
        Long employeeId,
        @NotNull Long toBranchId,
        @NotNull LocalDate effectiveDate,
        @NotBlank @Size(max = 800) String reason
) { }
