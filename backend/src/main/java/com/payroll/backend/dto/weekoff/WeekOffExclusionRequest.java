package com.payroll.backend.dto.weekoff;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record WeekOffExclusionRequest(
        @NotNull Long branchId,
        @NotNull Long departmentId,
        @NotNull Long designationId,
        @NotNull LocalDate date
) {
}
