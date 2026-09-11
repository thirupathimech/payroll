package com.payroll.backend.dto.overtime;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record OvertimeCreateRequest(
        Long employeeId,
        @NotNull LocalDate overtimeDate,
        @NotNull @Min(1) @Max(1439) Integer requestedMinutes,
        @Size(max = 800) String reason
) {
}
