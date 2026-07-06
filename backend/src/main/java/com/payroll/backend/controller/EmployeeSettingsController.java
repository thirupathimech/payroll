package com.payroll.backend.controller;

import com.payroll.backend.dto.employee.EmployeeSettingsRequest;
import com.payroll.backend.dto.employee.EmployeeSettingsResponse;
import com.payroll.backend.service.EmployeeSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/settings/employee")
public class EmployeeSettingsController {

    private final EmployeeSettingsService employeeSettingsService;

    @GetMapping
    public EmployeeSettingsResponse get() {
        return employeeSettingsService.get();
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public EmployeeSettingsResponse update(@Valid @RequestBody EmployeeSettingsRequest request) {
        return employeeSettingsService.update(request);
    }
}
