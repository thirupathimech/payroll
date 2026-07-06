package com.payroll.backend.dto.shift;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ShiftAssignmentRequest(
        @NotNull Long employeeId,
        @NotNull Long shiftId,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        boolean overrideExisting
) {
}
