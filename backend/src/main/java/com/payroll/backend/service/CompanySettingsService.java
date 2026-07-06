package com.payroll.backend.service;

import com.payroll.backend.domain.CompanySetting;
import com.payroll.backend.dto.settings.CompanySettingsRequest;
import com.payroll.backend.dto.settings.CompanySettingsResponse;
import com.payroll.backend.repository.CompanySettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompanySettingsService {

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
        setting.setAddress(request.address());
        setting.setCurrency(request.currency().trim().toUpperCase());
        setting.setTimezone(request.timezone().trim());
        setting.setPayrollCutoffDay(request.payrollCutoffDay());

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
                setting.getAddress(),
                setting.getCurrency(),
                setting.getTimezone(),
                setting.getPayrollCutoffDay(),
                setting.getUpdatedAt()
        );
    }
}
