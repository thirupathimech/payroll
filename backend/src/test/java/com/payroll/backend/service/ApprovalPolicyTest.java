package com.payroll.backend.service;

import com.payroll.backend.domain.AppUser;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ApprovalPolicyTest {

    @Test
    void blocksANonAdminFromApprovingTheirOwnRequest() {
        AppUser requester = user(7L, "hr@example.test");

        assertThatThrownBy(() -> ApprovalPolicy.assertCanApproveRequest(hr(), requester))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Only an ADMIN can approve their own request");
    }

    @Test
    void allowsAnAdminToApproveTheirOwnRequest() {
        AppUser requester = user(1L, "admin@example.test");

        assertThatCode(() -> ApprovalPolicy.assertCanApproveRequest(admin(), requester))
                .doesNotThrowAnyException();
    }

    @Test
    void blocksANonAdminFromApprovingTheirOwnEmployeeRequest() {
        Employee employee = new Employee();
        employee.setEmployeeCode("EMP-007");

        assertThatThrownBy(() -> ApprovalPolicy.assertCanApproveEmployeeRequest(hr(), employee))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Only an ADMIN can approve their own request");
    }

    @Test
    void blocksANonAdminFromApprovingAPayrollRunTheyCreated() {
        assertThatThrownBy(() -> ApprovalPolicy.assertCanApprovePayroll(hr(), "hr@example.test"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Only an ADMIN can approve a payroll run they created");
    }

    private static AppUser user(Long id, String email) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setEmail(email);
        return user;
    }

    private static UserPrincipal hr() {
        return principal(7L, "hr@example.test", "EMP-007", "ROLE_HR");
    }

    private static UserPrincipal admin() {
        return principal(1L, "admin@example.test", "ADMIN", "ROLE_ADMIN");
    }

    private static UserPrincipal principal(Long id, String email, String employeeCode, String role) {
        return new UserPrincipal(id, "ORG", email, email, "User", employeeCode, "",
                List.of(new SimpleGrantedAuthority(role)), true);
    }
}
