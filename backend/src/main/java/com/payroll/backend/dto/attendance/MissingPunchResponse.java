package com.payroll.backend.dto.attendance;

import com.payroll.backend.domain.enums.MissingPunchStatus;
import com.payroll.backend.domain.enums.MissingPunchType;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

public record MissingPunchResponse(
        Long id,
        Long employeeId,
        String employeeCode,
        String employeeName,
        LocalDate punchDate,
        LocalTime punchTime,
        MissingPunchType punchType,
        String remark,
        MissingPunchStatus status,
        String reviewerEmail,
        String reviewerComment,
        Instant reviewedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
