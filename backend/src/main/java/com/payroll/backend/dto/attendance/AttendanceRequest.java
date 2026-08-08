package com.payroll.backend.dto.attendance;
import jakarta.validation.constraints.*; import java.time.LocalDate; import java.time.LocalTime;
public record AttendanceRequest(@NotNull Long employeeId, @NotNull LocalDate date, LocalTime clockIn, LocalTime clockOut, @NotBlank String source) {}
