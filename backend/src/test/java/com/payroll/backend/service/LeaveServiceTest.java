package com.payroll.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.payroll.backend.domain.AppUser;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.LeaveRequest;
import com.payroll.backend.domain.Shift;
import com.payroll.backend.domain.ShiftAssignment;
import com.payroll.backend.dto.leave.LeaveCreateRequest;
import com.payroll.backend.dto.shift.ShiftSegmentResponse;
import com.payroll.backend.dto.shift.ShiftSegmentType;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.repository.AppUserRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.HolidayRepository;
import com.payroll.backend.repository.LeaveRequestRepository;
import com.payroll.backend.repository.ShiftAssignmentRepository;
import com.payroll.backend.repository.WeekOffAssignmentRepository;
import com.payroll.backend.repository.WeekOffExclusionRepository;
import com.payroll.backend.security.UserPrincipal;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LeaveServiceTest {

    @Test
    void requiresAnAssignedShiftForEveryLeaveDate() {
        Fixture fixture = new Fixture();
        when(fixture.assignmentRepository.findByOrgCodeAndEmployeeIdAndAssignmentDateBetweenOrderByAssignmentDate(
                Fixture.ORG, fixture.employee.getId(), LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 11)
        )).thenReturn(List.of(assignment(fixture.employee, fixture.shift, LocalDate.of(2026, 9, 10))));

        assertThatThrownBy(() -> fixture.service.create(
                request(LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 11), LocalTime.of(9, 0), LocalTime.of(18, 0)),
                fixture.principal
        )).isInstanceOf(BadRequestException.class)
                .hasMessageContaining("No shift is assigned on 2026-09-11");
    }

    @Test
    void excludesBreakMinutesWhenCalculatingLeaveHours() {
        Fixture fixture = new Fixture();
        when(fixture.assignmentRepository.findByOrgCodeAndEmployeeIdAndAssignmentDateBetweenOrderByAssignmentDate(
                Fixture.ORG, fixture.employee.getId(), LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 10)
        )).thenReturn(List.of(assignment(fixture.employee, fixture.shift, LocalDate.of(2026, 9, 10))));
        when(fixture.leaveRepository.save(any(LeaveRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = fixture.service.create(
                request(LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 10), LocalTime.of(9, 0), LocalTime.of(18, 0)),
                fixture.principal
        );

        assertThat(response.leaveMinutes()).isEqualTo(480);
    }

    @Test
    void rejectsLeaveRequestedEntirelyDuringABreak() {
        Fixture fixture = new Fixture();
        when(fixture.assignmentRepository.findByOrgCodeAndEmployeeIdAndAssignmentDateBetweenOrderByAssignmentDate(
                Fixture.ORG, fixture.employee.getId(), LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 10)
        )).thenReturn(List.of(assignment(fixture.employee, fixture.shift, LocalDate.of(2026, 9, 10))));

        assertThatThrownBy(() -> fixture.service.create(
                request(LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 10), LocalTime.of(13, 0), LocalTime.of(14, 0)),
                fixture.principal
        )).isInstanceOf(BadRequestException.class)
                .hasMessageContaining("falls entirely within a break");
    }

    private static LeaveCreateRequest request(LocalDate startDate, LocalDate endDate, LocalTime startTime, LocalTime endTime) {
        return new LeaveCreateRequest(7L, com.payroll.backend.domain.enums.LeaveType.ANNUAL,
                startDate, endDate, startTime, endTime, "Personal work");
    }

    private static ShiftAssignment assignment(Employee employee, Shift shift, LocalDate date) {
        ShiftAssignment assignment = new ShiftAssignment();
        assignment.setEmployee(employee);
        assignment.setShift(shift);
        assignment.setAssignmentDate(date);
        return assignment;
    }

    private static final class Fixture {
        private static final String ORG = "ORG";

        private final LeaveRequestRepository leaveRepository = mock(LeaveRequestRepository.class);
        private final EmployeeRepository employeeRepository = mock(EmployeeRepository.class);
        private final AppUserRepository userRepository = mock(AppUserRepository.class);
        private final AuditService auditService = mock(AuditService.class);
        private final CurrentOrgService orgService = mock(CurrentOrgService.class);
        private final EmployeeAccessService accessService = mock(EmployeeAccessService.class);
        private final ShiftAssignmentRepository assignmentRepository = mock(ShiftAssignmentRepository.class);
        private final HolidayRepository holidayRepository = mock(HolidayRepository.class);
        private final WeekOffAssignmentRepository weekOffRepository = mock(WeekOffAssignmentRepository.class);
        private final WeekOffExclusionRepository weekOffExclusionRepository = mock(WeekOffExclusionRepository.class);
        private final PayrollLockService payrollLockService = mock(PayrollLockService.class);
        private final LeaveService service = new LeaveService(
                leaveRepository, employeeRepository, userRepository, auditService, orgService, accessService,
                assignmentRepository, holidayRepository, weekOffRepository, weekOffExclusionRepository, new ObjectMapper(), payrollLockService
        );
        private final Employee employee = employee();
        private final Shift shift = shift();
        private final UserPrincipal principal = new UserPrincipal(
                1L, ORG, "hr", "hr@example.test", "HR User", null, "", List.of(), true
        );

        private Fixture() {
            when(orgService.orgCode()).thenReturn(ORG);
            when(employeeRepository.findByOrgCodeAndId(ORG, employee.getId())).thenReturn(Optional.of(employee));
        }

        private static Employee employee() {
            Employee employee = new Employee();
            employee.setId(7L);
            employee.setEmployeeCode("EMP-007");
            employee.setFirstName("Ada");
            employee.setLastName("Lovelace");
            return employee;
        }

        private static Shift shift() {
            Shift shift = new Shift();
            shift.setStartTime(LocalTime.of(9, 0));
            shift.setDurationHours(9);
            shift.setDurationMinutes(0);
            try {
                shift.setSegmentsJson(new ObjectMapper().writeValueAsString(List.of(
                        new ShiftSegmentResponse(ShiftSegmentType.WORK, 4, 0, 0),
                        new ShiftSegmentResponse(ShiftSegmentType.BREAK, 1, 0, 0),
                        new ShiftSegmentResponse(ShiftSegmentType.WORK, 4, 0, 0)
                )));
            } catch (Exception exception) {
                throw new IllegalStateException(exception);
            }
            return shift;
        }
    }
}
