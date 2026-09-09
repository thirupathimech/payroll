package com.payroll.backend.dto.attendance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record AttendanceRequest(
        @NotNull Long employeeId,
        @NotNull LocalDate date,
        LocalDate clockInDate,
        LocalDate clockOutDate,
        LocalTime clockIn,
        LocalTime clockOut,
        @NotBlank String source
) {
}
