package com.payroll.backend.dto.shift;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ShiftSegmentRequest(
        @NotNull ShiftSegmentType type,
        @NotNull @Min(0) @Max(23) Integer hours,
        @NotNull @Min(0) @Max(59) Integer minutes,
        @Min(0) @Max(240) Integer graceMinutes
) {
}
