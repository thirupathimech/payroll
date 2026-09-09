package com.payroll.backend.service;

import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.EmployeeLeaveEntitlement;
import com.payroll.backend.domain.LeaveRequest;
import com.payroll.backend.domain.enums.LeaveStatus;
import com.payroll.backend.domain.enums.LeaveType;
import com.payroll.backend.dto.leave.LeaveBalanceResponse;
import com.payroll.backend.repository.EmployeeLeaveEntitlementRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.LeaveRequestRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LeaveBalanceServiceTest {

    @Test
    void calculatesAvailableBalanceAfterApprovedAndPendingLeave() {
        Fixture fixture = new Fixture();
        EmployeeLeaveEntitlement annualEntitlement = entitlement(LeaveType.ANNUAL, 8 * 60, 2 * 60);
        when(fixture.entitlementRepository.findByOrgCodeAndEmployeeIdAndLeaveYear(anyString(), anyLong(), anyInt()))
                .thenReturn(List.of(annualEntitlement));
        when(fixture.leaveRequestRepository
                .findByOrgCodeAndEmployeeIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(anyString(), anyLong(), any(), any()))
                .thenReturn(List.of(
                        leave(LeaveType.ANNUAL, LeaveStatus.APPROVED, 3 * 60),
                        leave(LeaveType.ANNUAL, LeaveStatus.PENDING, 60),
                        leave(LeaveType.ANNUAL, LeaveStatus.REJECTED, 2 * 60),
                        leave(LeaveType.UNPAID, LeaveStatus.APPROVED, 8 * 60)
                ));

        List<LeaveBalanceResponse> balances = fixture.service.getBalances(fixture.employee.getId(), 2026, null);

        LeaveBalanceResponse annual = balances.stream()
                .filter(balance -> balance.leaveType() == LeaveType.ANNUAL)
                .findFirst()
                .orElseThrow();
        assertThat(annual.allocatedMinutes()).isEqualTo(8 * 60);
        assertThat(annual.carriedForwardMinutes()).isEqualTo(2 * 60);
        assertThat(annual.creditedMinutes()).isEqualTo(10 * 60);
        assertThat(annual.approvedMinutes()).isEqualTo(3 * 60);
        assertThat(annual.pendingMinutes()).isEqualTo(60);
        assertThat(annual.availableMinutes()).isEqualTo(6 * 60);
        assertThat(balances).noneMatch(balance -> balance.leaveType() == LeaveType.UNPAID);
    }

    private static EmployeeLeaveEntitlement entitlement(LeaveType leaveType, int allocatedMinutes, int carriedForwardMinutes) {
        EmployeeLeaveEntitlement entitlement = new EmployeeLeaveEntitlement();
        entitlement.setLeaveType(leaveType);
        entitlement.setAllocatedMinutes(allocatedMinutes);
        entitlement.setCarriedForwardMinutes(carriedForwardMinutes);
        return entitlement;
    }

    private static LeaveRequest leave(LeaveType leaveType, LeaveStatus status, int leaveMinutes) {
        LeaveRequest leave = new LeaveRequest();
        leave.setLeaveType(leaveType);
        leave.setStatus(status);
        leave.setLeaveMinutes(leaveMinutes);
        return leave;
    }

    private static class Fixture {
        private final EmployeeLeaveEntitlementRepository entitlementRepository = mock(EmployeeLeaveEntitlementRepository.class);
        private final LeaveRequestRepository leaveRequestRepository = mock(LeaveRequestRepository.class);
        private final EmployeeRepository employeeRepository = mock(EmployeeRepository.class);
        private final CurrentOrgService currentOrgService = mock(CurrentOrgService.class);
        private final EmployeeAccessService employeeAccessService = mock(EmployeeAccessService.class);
        private final AuditService auditService = mock(AuditService.class);
        private final Employee employee = employee();
        private final LeaveBalanceService service = new LeaveBalanceService(
                entitlementRepository,
                leaveRequestRepository,
                employeeRepository,
                currentOrgService,
                employeeAccessService,
                auditService
        );

        private Fixture() {
            when(currentOrgService.orgCode()).thenReturn("ORG");
            when(employeeRepository.findByOrgCodeAndId("ORG", employee.getId())).thenReturn(Optional.of(employee));
        }

        private static Employee employee() {
            Employee employee = new Employee();
            employee.setId(11L);
            employee.setEmployeeCode("EMP-011");
            employee.setFirstName("Asha");
            employee.setLastName("Kumar");
            return employee;
        }
    }
}
