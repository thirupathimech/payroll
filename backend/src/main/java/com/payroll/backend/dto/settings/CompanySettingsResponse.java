package com.payroll.backend.dto.settings;

import java.time.Instant;

public record CompanySettingsResponse(
        Long id,
        String companyName,
        String legalName,
        String taxId,
        String email,
        String phone,
        String website,
        String registrationNumber,
        String gstin,
        String panNumber,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode,
        String country,
        String address,
        String currency,
        String timezone,
        Integer payrollCutoffDay,
        String payrollFrequency,
        Integer payrollDisbursementDay,
        String weekStartDay,
        Instant updatedAt
) {
}
