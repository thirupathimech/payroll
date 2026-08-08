package com.payroll.backend.dto.attendance;
import com.payroll.backend.domain.enums.AttendanceMode; import java.time.Instant;
public record AttendanceSettingsResponse(Long id, AttendanceMode attendanceMode, boolean biometricEnabled, String biometricName, String biometricUrl, String biometricApiKey, Instant updatedAt) {}
