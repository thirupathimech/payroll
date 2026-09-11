package com.payroll.backend.service;

import com.payroll.backend.domain.AppUser;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.security.UserPrincipal;

/** Enforces separation of duties for approval and settlement actions. */
public final class ApprovalPolicy {

    private ApprovalPolicy() {
    }

    public static void assertCanApproveRequest(UserPrincipal principal, AppUser requester) {
        if (isAdmin(principal) || requester == null || principal == null) {
            return;
        }
        if (sameUser(principal, requester)) {
            throw new BadRequestException("Only an ADMIN can approve their own request");
        }
    }

    public static void assertCanApproveEmployeeRequest(UserPrincipal principal, Employee employee) {
        if (isAdmin(principal) || employee == null || principal == null) {
            return;
        }
        if (sameEmployee(principal, employee)) {
            throw new BadRequestException("Only an ADMIN can approve their own request");
        }
    }

    public static void assertCanApprovePayroll(UserPrincipal principal, String createdBy) {
        if (isAdmin(principal)) {
            return;
        }
        if (createdBy == null || createdBy.isBlank()) {
            throw new BadRequestException("Only an ADMIN can approve a payroll run with no recorded creator");
        }
        if (principal != null && createdBy.equalsIgnoreCase(principal.email())) {
            throw new BadRequestException("Only an ADMIN can approve a payroll run they created");
        }
    }

    public static boolean isAdmin(UserPrincipal principal) {
        return principal != null && principal.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    private static boolean sameUser(UserPrincipal principal, AppUser requester) {
        return principal.id() != null && principal.id().equals(requester.getId())
                || principal.email() != null && principal.email().equalsIgnoreCase(requester.getEmail());
    }

    private static boolean sameEmployee(UserPrincipal principal, Employee employee) {
        return principal.employeeCode() != null && employee.getEmployeeCode() != null
                && principal.employeeCode().equalsIgnoreCase(employee.getEmployeeCode());
    }
}
