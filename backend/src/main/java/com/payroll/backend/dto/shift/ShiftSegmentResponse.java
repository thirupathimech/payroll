package com.payroll.backend.dto.shift;

public record ShiftSegmentResponse(
        ShiftSegmentType type,
        Integer hours,
        Integer minutes,
        Integer graceMinutes
) {
}
