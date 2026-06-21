package com.payroll.backend.dto.leave;

import com.payroll.backend.domain.enums.LeaveStatus;
import com.payroll.backend.domain.enums.LeaveType;

import java.time.Instant;
import java.time.LocalDate;

public record LeaveResponse(
        Long id,
        Long employeeId,
        String employeeCode,
        String employeeName,
        LeaveType leaveType,
        LeaveStatus status,
        LocalDate startDate,
        LocalDate endDate,
        long days,
        String reason,
        String reviewerEmail,
        String reviewerComment,
        Instant reviewedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
