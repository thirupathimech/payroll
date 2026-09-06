package com.payroll.backend.controller;

import com.payroll.backend.dto.salary.EmployeeSalaryRequest;
import com.payroll.backend.dto.salary.EmployeeSalaryResponse;
import com.payroll.backend.dto.salary.SalaryComponentRequest;
import com.payroll.backend.dto.salary.SalaryComponentResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.SalaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/salary")
@PreAuthorize("hasAnyRole('ADMIN','HR')")
public class SalaryController {

    private final SalaryService salaryService;

    @GetMapping("/components")
    public List<SalaryComponentResponse> components() {
        return salaryService.components();
    }

    @PostMapping("/components")
    public SalaryComponentResponse createComponent(@Valid @RequestBody SalaryComponentRequest request) {
        return salaryService.createComponent(request);
    }

    @PutMapping("/components/{id}")
    public SalaryComponentResponse updateComponent(@PathVariable Long id, @Valid @RequestBody SalaryComponentRequest request) {
        return salaryService.updateComponent(id, request);
    }

    @GetMapping("/employees/{employeeId}")
    public EmployeeSalaryResponse employeeSalary(@PathVariable Long employeeId, @AuthenticationPrincipal UserPrincipal principal) {
        return salaryService.employeeSalary(employeeId, principal);
    }

    @PutMapping("/employees/{employeeId}")
    public EmployeeSalaryResponse saveEmployeeSalary(
            @PathVariable Long employeeId,
            @Valid @RequestBody EmployeeSalaryRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return salaryService.saveEmployeeSalary(employeeId, request, principal);
    }
}
