package com.payroll.backend.dto.weekoff;

import com.payroll.backend.domain.enums.WeekOffAssignmentType;
import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Set;

public record WeekOffAssignmentRequest(
        @NotNull WeekOffAssignmentType type,
        Long branchId,
        Long departmentId,
        Long designationId,
        Long employeeId,
        Set<DayOfWeek> dayOfWeeks,
        Set<LocalDate> dates
) {
}
