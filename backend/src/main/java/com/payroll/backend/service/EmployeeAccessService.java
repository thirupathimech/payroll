package com.payroll.backend.service;

import com.payroll.backend.domain.Employee;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class EmployeeAccessService {

    private final EmployeeRepository employeeRepository;
    private final CurrentOrgService currentOrgService;

    public Employee findCurrentEmployee(UserPrincipal principal) {
        if (principal == null || principal.employeeCode() == null || principal.employeeCode().isBlank()) {
            throw new ResourceNotFoundException("Employee profile not found");
        }
        return employeeRepository.findByOrgCodeAndEmployeeCodeIgnoreCase(currentOrgService.orgCode(), principal.employeeCode())
                .orElseThrow(() -> new ResourceNotFoundException("Employee profile not found"));
    }

    public boolean isEmployee(UserPrincipal principal) {
        return hasRole(principal, "ROLE_EMPLOYEE");
    }

    public boolean isManager(UserPrincipal principal) {
        return hasRole(principal, "ROLE_MANAGER");
    }

    public boolean isLead(UserPrincipal principal) {
        return hasRole(principal, "ROLE_LEAD");
    }

    public Long branchScopeId(UserPrincipal principal) {
        if (!isManager(principal)) {
            return null;
        }
        Employee currentEmployee = findCurrentEmployee(principal);
        return currentEmployee.getBranch() == null ? null : currentEmployee.getBranch().getId();
    }

    public List<Long> managedEmployeeIds(UserPrincipal principal) {
        if (!isLead(principal)) {
            return List.of();
        }
        Employee currentEmployee = findCurrentEmployee(principal);
        Set<Long> managedIds = new HashSet<>();
        collectManagedEmployeeIds(currentEmployee.getId(), managedIds);
        return managedIds.stream().sorted().toList();
    }

    public void assertCanAccessEmployee(UserPrincipal principal, Employee targetEmployee) {
        if (isEmployee(principal)) {
            Employee currentEmployee = findCurrentEmployee(principal);
            if (!currentEmployee.getId().equals(targetEmployee.getId())) {
                throw new ResourceNotFoundException("Employee not found");
            }
            return;
        }

        if (!isManager(principal)) {
            if (!isLead(principal)) {
                return;
            }
            if (!managedEmployeeIds(principal).contains(targetEmployee.getId())) {
                throw new ResourceNotFoundException("Employee not found");
            }
            return;
        }

        Employee currentEmployee = findCurrentEmployee(principal);
        Long currentBranchId = currentEmployee.getBranch() == null ? null : currentEmployee.getBranch().getId();
        Long targetBranchId = targetEmployee.getBranch() == null ? null : targetEmployee.getBranch().getId();
        if (currentBranchId == null || targetBranchId == null || !currentBranchId.equals(targetBranchId)) {
            throw new ResourceNotFoundException("Employee not found");
        }
    }

    public void assertCanAccessBranch(UserPrincipal principal, Long branchId) {
        if (isLead(principal)) {
            throw new ResourceNotFoundException("Branch not found");
        }
        if (!isManager(principal)) {
            return;
        }
        Long scopedBranchId = branchScopeId(principal);
        if (scopedBranchId == null || branchId == null || !scopedBranchId.equals(branchId)) {
            throw new ResourceNotFoundException("Branch not found");
        }
    }

    private void collectManagedEmployeeIds(Long managerId, Set<Long> managedIds) {
        if (managerId == null) {
            return;
        }
        List<Employee> directReports = employeeRepository.findByOrgCodeAndManagerIdOrderByFirstNameAsc(currentOrgService.orgCode(), managerId);
        for (Employee directReport : directReports) {
            if (managedIds.add(directReport.getId())) {
                collectManagedEmployeeIds(directReport.getId(), managedIds);
            }
        }
    }

    private boolean hasRole(UserPrincipal principal, String role) {
        return principal != null && principal.getAuthorities().stream()
                .anyMatch(authority -> role.equals(authority.getAuthority()));
    }
}
