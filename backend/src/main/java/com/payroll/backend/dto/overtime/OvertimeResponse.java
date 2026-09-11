package com.payroll.backend.dto.overtime;

import com.payroll.backend.domain.enums.OvertimeStatus;

import java.time.Instant;
import java.time.LocalDate;

public record OvertimeResponse(
        Long id,
        Long employeeId,
        String employeeCode,
        String employeeName,
        LocalDate overtimeDate,
        Integer requestedMinutes,
        Integer punchOvertimeMinutes,
        Integer eligibleMinutes,
        Integer approvedMinutes,
        String reason,
        OvertimeStatus status,
        String requestedByEmail,
        String reviewerEmail,
        String reviewerComment,
        Instant reviewedAt,
        Long payrollRunId,
        Instant paidAt,
        Instant createdAt,
        Instant updatedAt
) {
}
