package com.payroll.backend.dto.auth;

import com.payroll.backend.domain.enums.RoleName;

public record UserSummary(
        Long id,
        String orgCode,
        String email,
        String fullName,
        RoleName role
) {
}
