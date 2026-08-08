package com.payroll.backend.dto.holiday;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record HolidayRequest(
        @NotNull Long branchId,
        @NotNull Long departmentId,
        @NotNull Long designationId,
        @NotNull LocalDate date,
        @NotBlank @Size(max = 160) String title
) {}
