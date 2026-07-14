package com.payroll.backend.controller;

import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.dto.common.MessageResponse;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.employee.EmployeeHierarchyResponse;
import com.payroll.backend.dto.employee.EmployeeRequest;
import com.payroll.backend.dto.employee.EmployeeResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.EmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    @GetMapping
    public PageResponse<EmployeeResponse> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) EmploymentStatus status,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return employeeService.search(search, status, departmentId, page, size, principal);
    }

    @GetMapping("/{id}")
    public EmployeeResponse get(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return employeeService.get(id, principal);
    }

    @GetMapping("/me")
    public EmployeeResponse getCurrent(@AuthenticationPrincipal UserPrincipal principal) {
        return employeeService.getCurrent(principal);
    }

    @GetMapping("/me/hierarchy")
    public EmployeeHierarchyResponse hierarchy(@AuthenticationPrincipal UserPrincipal principal) {
        return employeeService.hierarchy(principal);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public EmployeeResponse create(@Valid @RequestBody EmployeeRequest request) {
        return employeeService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public EmployeeResponse update(@PathVariable Long id, @Valid @RequestBody EmployeeRequest request) {
        return employeeService.update(id, request);
    }

    @PutMapping("/me")
    public EmployeeResponse updateCurrent(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody EmployeeRequest request
    ) {
        return employeeService.updateCurrent(principal, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public MessageResponse delete(@PathVariable Long id) {
        employeeService.delete(id);
        return new MessageResponse("Employee marked as terminated");
    }
}
