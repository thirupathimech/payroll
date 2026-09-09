package com.payroll.backend.service;

import com.payroll.backend.domain.CompanySetting;
import com.payroll.backend.repository.CompanySettingRepository;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CompanySettingsServiceTest {

    @Test
    void storesLogoAndReturnsDataUrlForReports() {
        CompanySettingRepository repository = mock(CompanySettingRepository.class);
        AuditService auditService = mock(AuditService.class);
        CurrentOrgService currentOrgService = mock(CurrentOrgService.class);
        CompanySetting setting = new CompanySetting();
        setting.setId(4L);
        setting.setOrgCode("ORG");
        setting.setCompanyName("Acme");
        setting.setCurrency("INR");
        setting.setTimezone("Asia/Kolkata");
        setting.setPayrollCutoffDay(25);
        setting.setPayrollFrequency("MONTHLY");
        setting.setPayrollDisbursementDay(1);
        setting.setWeekStartDay("MONDAY");
        when(currentOrgService.orgCode()).thenReturn("ORG");
        when(repository.findByOrgCode("ORG")).thenReturn(Optional.of(setting));
        when(repository.save(any(CompanySetting.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CompanySettingsService service = new CompanySettingsService(repository, auditService, currentOrgService);
        var response = service.updateLogo(new MockMultipartFile(
                "file", "logo.png", "image/png", new byte[] {1, 2, 3}
        ));

        assertThat(response.logoDataUrl()).isEqualTo("data:image/png;base64,AQID");
        assertThat(setting.getLogoContentType()).isEqualTo("image/png");
        assertThat(setting.getLogoData()).containsExactly(1, 2, 3);
    }

    @Test
    void rejectsUnsupportedLogoTypes() {
        CompanySettingRepository repository = mock(CompanySettingRepository.class);
        CompanySettingsService service = new CompanySettingsService(repository, mock(AuditService.class), mock(CurrentOrgService.class));

        assertThatThrownBy(() -> service.updateLogo(new MockMultipartFile(
                "file", "logo.gif", "image/gif", new byte[] {1}
        ))).isInstanceOf(com.payroll.backend.exception.BadRequestException.class)
                .hasMessageContaining("PNG, JPG, WEBP, or SVG");
    }
}
