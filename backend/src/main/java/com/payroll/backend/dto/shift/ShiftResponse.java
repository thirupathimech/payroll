package com.payroll.backend.dto.shift;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;

public record ShiftResponse(
        Long id,
        String name,
        String code,
        LocalTime startTime,
        Integer durationHours,
        Integer durationMinutes,
        List<ShiftSegmentResponse> segments,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
