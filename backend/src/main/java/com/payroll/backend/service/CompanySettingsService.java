package com.payroll.backend.service;

import com.payroll.backend.domain.CompanySetting;
import com.payroll.backend.dto.settings.CompanySettingsRequest;
import com.payroll.backend.dto.settings.CompanySettingsResponse;
import com.payroll.backend.repository.CompanySettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CompanySettingsService {

    private static final List<String> PAYROLL_FREQUENCIES = List.of("WEEKLY", "BIWEEKLY", "MONTHLY");

    private final CompanySettingRepository companySettingRepository;
    private final AuditService auditService;
    private final CurrentOrgService currentOrgService;

    @Transactional(readOnly = true)
    public CompanySettingsResponse get() {
        return toResponse(firstOrDefault());
    }

    @Transactional
    public CompanySettingsResponse update(CompanySettingsRequest request) {
        CompanySetting setting = firstOrDefault();
        setting.setCompanyName(request.companyName().trim());
        setting.setLegalName(request.legalName());
        setting.setTaxId(request.taxId());
        setting.setEmail(request.email());
        setting.setPhone(request.phone());
        setting.setWebsite(trim(request.website()));
        setting.setRegistrationNumber(trim(request.registrationNumber()));
        setting.setGstin(trimToUpper(request.gstin()));
        setting.setPanNumber(trimToUpper(request.panNumber()));
        setting.setAddressLine1(trim(request.addressLine1()));
        setting.setAddressLine2(trim(request.addressLine2()));
        setting.setCity(trim(request.city()));
        setting.setState(trim(request.state()));
        setting.setPostalCode(trim(request.postalCode()));
        setting.setCountry(trim(request.country()));
        setting.setAddress(formattedAddress(setting, request.address()));
        setting.setCurrency(request.currency().trim().toUpperCase());
        setting.setTimezone(request.timezone().trim());
        setting.setPayrollCutoffDay(request.payrollCutoffDay());
        setting.setPayrollFrequency(normalizePayrollFrequency(request.payrollFrequency()));
        setting.setPayrollDisbursementDay(request.payrollDisbursementDay());
        setting.setWeekStartDay(normalizeWeekStartDay(request.weekStartDay()));

        CompanySetting saved = companySettingRepository.save(setting);
        auditService.log("COMPANY_SETTINGS_UPDATED", "CompanySetting", saved.getId(), saved.getCompanyName());
        return toResponse(saved);
    }

    private CompanySetting firstOrDefault() {
        String orgCode = currentOrgService.orgCode();
        return companySettingRepository.findByOrgCode(orgCode)
                .orElseGet(() -> {
                    CompanySetting setting = new CompanySetting();
                    setting.setOrgCode(orgCode);
                    setting.setCompanyName("New Organization");
                    setting.setCurrency("USD");
                    setting.setTimezone("UTC");
                    setting.setPayrollCutoffDay(25);
                    setting.setPayrollFrequency("MONTHLY");
                    setting.setPayrollDisbursementDay(1);
                    setting.setWeekStartDay("MONDAY");
                    return companySettingRepository.save(setting);
                });
    }

    private CompanySettingsResponse toResponse(CompanySetting setting) {
        return new CompanySettingsResponse(
                setting.getId(),
                setting.getCompanyName(),
                setting.getLegalName(),
                setting.getTaxId(),
                setting.getEmail(),
                setting.getPhone(),
                setting.getWebsite(),
                setting.getRegistrationNumber(),
                setting.getGstin(),
                setting.getPanNumber(),
                setting.getAddressLine1(),
                setting.getAddressLine2(),
                setting.getCity(),
                setting.getState(),
                setting.getPostalCode(),
                setting.getCountry(),
                setting.getAddress(),
                setting.getCurrency(),
                setting.getTimezone(),
                setting.getPayrollCutoffDay(),
                setting.getPayrollFrequency(),
                setting.getPayrollDisbursementDay(),
                setting.getWeekStartDay(),
                setting.getUpdatedAt()
        );
    }

    private String formattedAddress(CompanySetting setting, String legacyAddress) {
        String formatted = java.util.stream.Stream.of(
                        setting.getAddressLine1(),
                        setting.getAddressLine2(),
                        join(", ", setting.getCity(), setting.getState(), setting.getPostalCode()),
                        setting.getCountry()
                )
                .filter(value -> value != null && !value.isBlank())
                .reduce((left, right) -> left + "\n" + right)
                .orElse("");
        return formatted.isBlank() ? trim(legacyAddress) : formatted;
    }

    private String join(String separator, String... values) {
        return java.util.Arrays.stream(values)
                .filter(value -> value != null && !value.isBlank())
                .reduce((left, right) -> left + separator + right)
                .orElse("");
    }

    private String normalizePayrollFrequency(String value) {
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (!PAYROLL_FREQUENCIES.contains(normalized)) {
            throw new com.payroll.backend.exception.BadRequestException("Payroll frequency must be weekly, biweekly, or monthly");
        }
        return normalized;
    }

    private String normalizeWeekStartDay(String value) {
        try {
            return DayOfWeek.valueOf(value.trim().toUpperCase(Locale.ROOT)).name();
        } catch (IllegalArgumentException exception) {
            throw new com.payroll.backend.exception.BadRequestException("Week start day must be a valid day of the week");
        }
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private String trimToUpper(String value) {
        String trimmed = trim(value);
        return trimmed == null ? null : trimmed.toUpperCase(Locale.ROOT);
    }
}
