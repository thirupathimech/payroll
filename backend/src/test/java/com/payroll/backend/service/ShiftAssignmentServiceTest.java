package com.payroll.backend.service;

import com.payroll.backend.domain.Department;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.LeaveRequest;
import com.payroll.backend.domain.Shift;
import com.payroll.backend.domain.ShiftAssignment;
import com.payroll.backend.domain.enums.LeaveStatus;
import com.payroll.backend.dto.shift.ShiftAssignmentBulkUploadRequest;
import com.payroll.backend.dto.shift.ShiftAssignmentBulkUploadRowRequest;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.LeaveRequestRepository;
import com.payroll.backend.repository.ShiftAssignmentRepository;
import com.payroll.backend.repository.ShiftRepository;
import com.payroll.backend.security.UserPrincipal;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ShiftAssignmentServiceTest {

    @Test
    void rejectsEntireUploadWhenConflictsExistAndOverwriteIsDisabled() {
        Fixture fixture = new Fixture();
        ShiftAssignment existing = assignment(fixture.employee, fixture.shift, LocalDate.of(2026, 9, 10));
        when(fixture.assignmentRepository.findByOrgCodeAndEmployeeIdAndAssignmentDateIn(anyString(), any(), any()))
                .thenReturn(List.of(existing));

        assertThatThrownBy(() -> fixture.service.bulkCreate(fixture.request(false), fixture.principal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Enable overwrite")
                .hasMessageContaining("no assignments were saved");

        verify(fixture.assignmentRepository, never()).deleteAll(any());
        verify(fixture.assignmentRepository, never()).save(any(ShiftAssignment.class));
    }

    @Test
    void replacesConflictsAndSavesEveryDayWhenOverwriteIsEnabled() {
        Fixture fixture = new Fixture();
        ShiftAssignment existing = assignment(fixture.employee, fixture.shift, LocalDate.of(2026, 9, 10));
        when(fixture.assignmentRepository.findByOrgCodeAndEmployeeIdAndAssignmentDateIn(anyString(), any(), any()))
                .thenReturn(List.of(existing));
        AtomicLong ids = new AtomicLong(100);
        when(fixture.assignmentRepository.save(any(ShiftAssignment.class))).thenAnswer(invocation -> {
            ShiftAssignment saved = invocation.getArgument(0);
            saved.setId(ids.incrementAndGet());
            return saved;
        });

        var result = fixture.service.bulkCreate(fixture.request(true), fixture.principal);

        assertThat(result.uploadedRows()).isEqualTo(1);
        assertThat(result.replacedAssignments()).isEqualTo(1);
        assertThat(result.savedAssignments()).isEqualTo(2);
        assertThat(result.assignments()).extracting(assignment -> assignment.date())
                .containsExactly(LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 11));
        verify(fixture.assignmentRepository).deleteAll(List.of(existing));
        verify(fixture.assignmentRepository).flush();
        verify(fixture.assignmentRepository, times(2)).save(any(ShiftAssignment.class));
    }

    @Test
    void rejectsUploadOverrideWhenPendingLeaveExists() {
        Fixture fixture = new Fixture();
        LeaveRequest leave = new LeaveRequest();
        leave.setStatus(LeaveStatus.PENDING);
        leave.setStartDate(LocalDate.of(2026, 9, 10));
        leave.setEndDate(LocalDate.of(2026, 9, 11));
        when(fixture.leaveRequestRepository.findByOrgCodeAndEmployeeIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                Fixture.ORG_CODE, fixture.employee.getId(), LocalDate.of(2026, 9, 11), LocalDate.of(2026, 9, 10)
        )).thenReturn(List.of(leave));

        assertThatThrownBy(() -> fixture.service.bulkCreate(fixture.request(true), fixture.principal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("pending or approved leave requests")
                .hasMessageContaining("Cancel or reject");

        verify(fixture.assignmentRepository, never()).deleteAll(any());
        verify(fixture.assignmentRepository, never()).save(any(ShiftAssignment.class));
    }

    private static ShiftAssignment assignment(Employee employee, Shift shift, LocalDate date) {
        ShiftAssignment assignment = new ShiftAssignment();
        assignment.setEmployee(employee);
        assignment.setShift(shift);
        assignment.setAssignmentDate(date);
        return assignment;
    }

    private static final class Fixture {
        private static final String ORG_CODE = "ORG";

        private final ShiftAssignmentRepository assignmentRepository = mock(ShiftAssignmentRepository.class);
        private final EmployeeRepository employeeRepository = mock(EmployeeRepository.class);
        private final ShiftRepository shiftRepository = mock(ShiftRepository.class);
        private final LeaveRequestRepository leaveRequestRepository = mock(LeaveRequestRepository.class);
        private final CurrentOrgService currentOrgService = mock(CurrentOrgService.class);
        private final AuditService auditService = mock(AuditService.class);
        private final EmployeeAccessService employeeAccessService = mock(EmployeeAccessService.class);
        private final PayrollLockService payrollLockService = mock(PayrollLockService.class);
        private final ShiftAssignmentService service = new ShiftAssignmentService(
                assignmentRepository,
                employeeRepository,
                shiftRepository,
                leaveRequestRepository,
                currentOrgService,
                auditService,
                employeeAccessService,
                payrollLockService
        );
        private final Employee employee = employee();
        private final Shift shift = shift();
        private final UserPrincipal principal = new UserPrincipal(
                1L, ORG_CODE, "hr", "hr@example.test", "HR User", null, "", List.of(), true
        );

        private Fixture() {
            when(currentOrgService.orgCode()).thenReturn(ORG_CODE);
            when(employeeRepository.findByOrgCodeAndEmployeeCodeIgnoreCase(ORG_CODE, "EMP-001")).thenReturn(Optional.of(employee));
            when(shiftRepository.findByOrgCodeAndCodeIgnoreCase(ORG_CODE, "DAY")).thenReturn(Optional.of(shift));
        }

        private ShiftAssignmentBulkUploadRequest request(boolean overwriteExisting) {
            return new ShiftAssignmentBulkUploadRequest(
                    overwriteExisting,
                    List.of(new ShiftAssignmentBulkUploadRowRequest(
                            "EMP-001", "DAY", LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 11)
                    ))
            );
        }

        private static Employee employee() {
            Department department = new Department();
            department.setId(7L);
            department.setName("Engineering");
            Employee employee = new Employee();
            employee.setId(11L);
            employee.setEmployeeCode("EMP-001");
            employee.setFirstName("Asha");
            employee.setLastName("Kumar");
            employee.setDepartment(department);
            return employee;
        }

        private static Shift shift() {
            Shift shift = new Shift();
            shift.setId(21L);
            shift.setCode("DAY");
            shift.setName("Day Shift");
            shift.setStartTime(LocalTime.of(9, 0));
            shift.setDurationHours(8);
            shift.setDurationMinutes(0);
            shift.setActive(true);
            return shift;
        }
    }
}
