package com.payroll.backend.dto.shift;

import java.time.Instant;
import java.time.LocalTime;

public record ShiftResponse(
        Long id,
        String name,
        String code,
        LocalTime startTime,
        Integer durationHours,
        Integer durationMinutes,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
