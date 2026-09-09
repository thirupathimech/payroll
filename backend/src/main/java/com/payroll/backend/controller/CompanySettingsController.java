package com.payroll.backend.controller;

import com.payroll.backend.dto.settings.CompanySettingsRequest;
import com.payroll.backend.dto.settings.CompanySettingsResponse;
import com.payroll.backend.service.CompanySettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/settings/company")
public class CompanySettingsController {

    private final CompanySettingsService companySettingsService;

    @GetMapping
    public CompanySettingsResponse get() {
        return companySettingsService.get();
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public CompanySettingsResponse update(@Valid @RequestBody CompanySettingsRequest request) {
        return companySettingsService.update(request);
    }

    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public CompanySettingsResponse uploadLogo(@RequestParam("file") MultipartFile file) {
        return companySettingsService.updateLogo(file);
    }

    @DeleteMapping("/logo")
    @PreAuthorize("hasRole('ADMIN')")
    public CompanySettingsResponse deleteLogo() {
        return companySettingsService.deleteLogo();
    }
}
