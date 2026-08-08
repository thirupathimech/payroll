package com.payroll.backend.dto.attendance;
import com.payroll.backend.domain.enums.AttendanceMode;
import jakarta.validation.constraints.NotNull;
public record AttendanceSettingsRequest(@NotNull AttendanceMode attendanceMode, boolean biometricEnabled, String biometricName, String biometricUrl, String biometricApiKey) {}
