package com.payroll.backend.dto.user;

import com.payroll.backend.domain.enums.RoleName;

import java.time.Instant;

public record UserResponse(
        Long id,
        String username,
        String employeeCode,
        String fullName,
        RoleName role,
        boolean enabled,
        Instant createdAt,
        Instant updatedAt
) {
}
