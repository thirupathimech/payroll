package com.payroll.backend.dto.shift;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

public record ShiftAssignmentResponse(
        Long id,
        Long employeeId,
        String employeeCode,
        String employeeName,
        Long departmentId,
        String departmentName,
        Long shiftId,
        String shiftName,
        String shiftCode,
        LocalTime startTime,
        Integer durationHours,
        Integer durationMinutes,
        LocalDate date,
        Instant createdAt,
        Instant updatedAt
) {
}
