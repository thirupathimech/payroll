package com.payroll.backend.dto.weekoff;

import com.payroll.backend.domain.enums.WeekOffAssignmentType;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Instant;

public record WeekOffAssignmentResponse(
        Long id,
        WeekOffAssignmentType type,
        Long branchId,
        String branchName,
        Long departmentId,
        String departmentName,
        Long designationId,
        String designationTitle,
        Long employeeId,
        String employeeCode,
        String employeeName,
        DayOfWeek dayOfWeek,
        LocalDate date,
        Instant createdAt,
        Instant updatedAt
) {
}
