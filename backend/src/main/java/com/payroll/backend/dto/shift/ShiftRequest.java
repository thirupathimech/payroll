package com.payroll.backend.dto.shift;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;

import java.time.LocalTime;
import java.util.List;

public record ShiftRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 30) String code,
        @NotNull LocalTime startTime,
        @Min(0) @Max(23) Integer durationHours,
        @Min(0) @Max(59) Integer durationMinutes,
        List<@Valid ShiftSegmentRequest> segments,
        Boolean active
) {
}
