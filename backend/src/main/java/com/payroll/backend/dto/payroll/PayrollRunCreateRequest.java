package com.payroll.backend.dto.payroll;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record PayrollRunCreateRequest(
        @NotNull @Min(2000) @Max(2100) Integer year,
        @NotNull @Min(1) @Max(12) Integer month,
        LocalDate anchorDate
) {
    /** Keeps existing API clients and service tests compatible. */
    public PayrollRunCreateRequest(Integer year, Integer month) {
        this(year, month, null);
    }
}
