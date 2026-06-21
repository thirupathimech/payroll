package com.payroll.backend.dto.settings;

import java.time.Instant;

public record CompanySettingsResponse(
        Long id,
        String companyName,
        String legalName,
        String taxId,
        String email,
        String phone,
        String address,
        String currency,
        String timezone,
        Integer payrollCutoffDay,
        Instant updatedAt
) {
}
