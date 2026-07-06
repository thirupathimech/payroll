package com.payroll.backend.dto.employee;

import com.payroll.backend.domain.EmployeeCodeMode;

import java.time.Instant;

public record EmployeeSettingsResponse(
        Long id,
        EmployeeCodeMode codeMode,
        String prefix,
        String suffix,
        Integer startingNumber,
        Integer padding,
        Instant updatedAt
) {
}
