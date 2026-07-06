package com.payroll.backend.service;

import com.payroll.backend.domain.EmployeeCodeMode;
import com.payroll.backend.domain.EmployeeSetting;
import com.payroll.backend.dto.employee.EmployeeSettingsRequest;
import com.payroll.backend.dto.employee.EmployeeSettingsResponse;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.EmployeeSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class EmployeeSettingsService {

    private final EmployeeSettingRepository employeeSettingRepository;
    private final EmployeeRepository employeeRepository;
    private final CurrentOrgService currentOrgService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public EmployeeSettingsResponse get() {
        return toResponse(firstOrDefault());
    }

    @Transactional
    public EmployeeSettingsResponse update(EmployeeSettingsRequest request) {
        EmployeeSetting setting = firstOrDefault();
        setting.setCodeMode(request.codeMode());
        setting.setPrefix(request.prefix().trim().toUpperCase());
        setting.setSuffix(request.suffix() == null ? "" : request.suffix().trim().toUpperCase());
        setting.setStartingNumber(request.startingNumber());
        setting.setNumberPadding(request.padding());
        EmployeeSetting saved = employeeSettingRepository.save(setting);
        auditService.log("EMPLOYEE_SETTINGS_UPDATED", "EmployeeSetting", saved.getId(), saved.getCodeMode().name());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public String generateNextEmployeeCode() {
        EmployeeSetting setting = firstOrDefault();
        if (setting.getCodeMode() != EmployeeCodeMode.AUTO) {
            return null;
        }

        int nextNumber = Math.max(setting.getStartingNumber(), nextSequenceNumber(setting));
        return setting.getPrefix()
                + leftPad(nextNumber, Math.max(1, setting.getNumberPadding()))
                + setting.getSuffix();
    }

    private EmployeeSetting firstOrDefault() {
        return employeeSettingRepository.findByOrgCode(currentOrgService.orgCode())
                .orElseGet(() -> {
                    EmployeeSetting setting = new EmployeeSetting();
                    setting.setOrgCode(currentOrgService.orgCode());
                    return employeeSettingRepository.save(setting);
                });
    }

    private EmployeeSettingsResponse toResponse(EmployeeSetting setting) {
        return new EmployeeSettingsResponse(
                setting.getId(),
                setting.getCodeMode(),
                setting.getPrefix(),
                setting.getSuffix(),
                setting.getStartingNumber(),
                setting.getNumberPadding(),
                setting.getUpdatedAt()
        );
    }

    private int nextSequenceNumber(EmployeeSetting setting) {
        Pattern pattern = Pattern.compile(
                "^" + Pattern.quote(setting.getPrefix()) + "(\\d+)" + Pattern.quote(setting.getSuffix()) + "$"
        );

        return employeeRepository.findEmployeeCodesByOrgCode(currentOrgService.orgCode()).stream()
                .map(pattern::matcher)
                .filter(Matcher::matches)
                .mapToInt(matcher -> Integer.parseInt(matcher.group(1)) + 1)
                .max()
                .orElse(Math.max(0, setting.getStartingNumber()));
    }

    private String leftPad(int value, int padding) {
        String number = String.valueOf(value);
        if (number.length() >= padding) {
            return number;
        }
        return "0".repeat(padding - number.length()) + number;
    }
}
