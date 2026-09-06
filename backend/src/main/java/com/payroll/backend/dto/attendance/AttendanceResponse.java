package com.payroll.backend.dto.attendance;
import java.time.*;
public record AttendanceResponse(Long id, Long employeeId, String employeeCode, String employeeName, LocalDate date, LocalDate clockInDate, LocalTime clockIn, LocalDate clockOutDate, LocalTime clockOut, String source) {}
