package com.payroll.backend.dto.settings;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CompanySettingsRequest(
        @NotBlank @Size(max = 180) String companyName,
        @Size(max = 220) String legalName,
        @Size(max = 80) String taxId,
        @Email @Size(max = 160) String email,
        @Size(max = 40) String phone,
        @Size(max = 160) String website,
        @Size(max = 80) String registrationNumber,
        @Size(max = 20) String gstin,
        @Size(max = 20) String panNumber,
        @Size(max = 250) String addressLine1,
        @Size(max = 250) String addressLine2,
        @Size(max = 100) String city,
        @Size(max = 100) String state,
        @Size(max = 20) String postalCode,
        @Size(max = 80) String country,
        @Size(max = 1200) String address,
        @NotBlank @Size(max = 10) String currency,
        @NotBlank @Size(max = 80) String timezone,
        @NotNull @Min(1) @Max(31) Integer payrollCutoffDay,
        @NotBlank @Size(max = 20) String payrollFrequency,
        @NotNull @Min(1) @Max(31) Integer payrollDisbursementDay,
        @NotBlank @Size(max = 20) String weekStartDay
) {
}
