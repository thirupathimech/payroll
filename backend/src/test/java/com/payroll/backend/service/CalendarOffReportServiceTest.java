package com.payroll.backend.service;

import com.payroll.backend.domain.Branch;
import com.payroll.backend.domain.Department;
import com.payroll.backend.domain.Designation;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.Holiday;
import com.payroll.backend.domain.WeekOffAssignment;
import com.payroll.backend.domain.WeekOffExclusion;
import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.domain.enums.WeekOffAssignmentType;
import com.payroll.backend.dto.report.CalendarOffReportRow;
import com.payroll.backend.dto.report.CalendarOffType;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.HolidayRepository;
import com.payroll.backend.repository.WeekOffAssignmentRepository;
import com.payroll.backend.repository.WeekOffExclusionRepository;
import com.payroll.backend.security.UserPrincipal;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CalendarOffReportServiceTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 9, 7);

    @Test
    void resolvesHolidayRulesOnlyForTheMatchingEmployeeGroup() {
        Fixture fixture = new Fixture();
        Holiday holiday = new Holiday();
        holiday.setBranch(fixture.branch);
        holiday.setDepartment(fixture.department);
        holiday.setDesignation(fixture.designation);
        holiday.setHolidayDate(MONDAY);
        holiday.setTitle("Foundation Day");
        when(fixture.holidayRepository.findForCalendarReport(anyString(), any(), any())).thenReturn(List.of(holiday));

        List<CalendarOffReportRow> rows = fixture.service.calendarOff(
                CalendarOffType.HOLIDAY, MONDAY, MONDAY.plusDays(1), null, null, null, null, fixture.principal
        );

        assertThat(rows).extracting(CalendarOffReportRow::date, CalendarOffReportRow::calendarOff, CalendarOffReportRow::appliedVia)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(MONDAY, "Foundation Day", "Holiday rule"));
    }

    @Test
    void givesEmployeeRulesPriorityAndHonoursOnlyGroupExclusions() {
        Fixture fixture = new Fixture();
        WeekOffAssignment groupMonday = groupWeekly(fixture, DayOfWeek.MONDAY);
        WeekOffAssignment groupWednesday = groupWeekly(fixture, DayOfWeek.WEDNESDAY);
        WeekOffAssignment employeeMonday = employeeWeekly(fixture, DayOfWeek.MONDAY);
        WeekOffAssignment employeeDate = employeeDate(fixture, MONDAY.plusDays(1));
        when(fixture.weekOffAssignmentRepository.findForCalendarReport(anyString(), anyList(), any(), any(), any()))
                .thenReturn(List.of(groupMonday, groupWednesday, employeeMonday, employeeDate));
        WeekOffExclusion exclusion = new WeekOffExclusion();
        exclusion.setBranch(fixture.branch);
        exclusion.setDepartment(fixture.department);
        exclusion.setDesignation(fixture.designation);
        exclusion.setExcludedDate(MONDAY.plusDays(2));
        when(fixture.weekOffExclusionRepository.findForCalendarReport(anyString(), any(), any())).thenReturn(List.of(exclusion));

        List<CalendarOffReportRow> rows = fixture.service.calendarOff(
                CalendarOffType.WEEK_OFF, MONDAY, MONDAY.plusDays(2), null, null, null, null, fixture.principal
        );

        assertThat(rows).extracting(CalendarOffReportRow::date, CalendarOffReportRow::appliedVia)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(MONDAY, "Employee weekly"),
                        org.assertj.core.groups.Tuple.tuple(MONDAY.plusDays(1), "Employee date")
                );
    }

    private static WeekOffAssignment groupWeekly(Fixture fixture, DayOfWeek day) {
        WeekOffAssignment assignment = new WeekOffAssignment();
        assignment.setAssignmentType(WeekOffAssignmentType.GROUP_WEEKLY);
        assignment.setBranch(fixture.branch);
        assignment.setDepartment(fixture.department);
        assignment.setDesignation(fixture.designation);
        assignment.setDayOfWeek(day);
        return assignment;
    }

    private static WeekOffAssignment employeeWeekly(Fixture fixture, DayOfWeek day) {
        WeekOffAssignment assignment = new WeekOffAssignment();
        assignment.setAssignmentType(WeekOffAssignmentType.EMPLOYEE_WEEKLY);
        assignment.setEmployee(fixture.employee);
        assignment.setDayOfWeek(day);
        return assignment;
    }

    private static WeekOffAssignment employeeDate(Fixture fixture, LocalDate date) {
        WeekOffAssignment assignment = new WeekOffAssignment();
        assignment.setAssignmentType(WeekOffAssignmentType.EMPLOYEE_DATE);
        assignment.setEmployee(fixture.employee);
        assignment.setWeekOffDate(date);
        return assignment;
    }

    private static final class Fixture {
        private final EmployeeRepository employeeRepository = mock(EmployeeRepository.class);
        private final HolidayRepository holidayRepository = mock(HolidayRepository.class);
        private final WeekOffAssignmentRepository weekOffAssignmentRepository = mock(WeekOffAssignmentRepository.class);
        private final WeekOffExclusionRepository weekOffExclusionRepository = mock(WeekOffExclusionRepository.class);
        private final CurrentOrgService currentOrgService = mock(CurrentOrgService.class);
        private final EmployeeAccessService employeeAccessService = mock(EmployeeAccessService.class);
        private final CalendarOffReportService service = new CalendarOffReportService(
                employeeRepository, holidayRepository, weekOffAssignmentRepository, weekOffExclusionRepository,
                currentOrgService, employeeAccessService
        );
        private final UserPrincipal principal = mock(UserPrincipal.class);
        private final Branch branch = branch();
        private final Department department = department();
        private final Designation designation = designation();
        private final Employee employee = employee();

        private Fixture() {
            when(currentOrgService.orgCode()).thenReturn("ORG");
            when(employeeAccessService.managedEmployeeIds(principal)).thenReturn(List.of());
            when(employeeAccessService.isLead(principal)).thenReturn(false);
            when(employeeAccessService.branchScopeId(principal)).thenReturn(null);
            when(employeeRepository.findCalendarReportEmployees(
                    anyString(), any(), any(), any(), any(), any(), any(), anyList(), anyBoolean()
            )).thenReturn(List.of(employee));
        }

        private static Branch branch() {
            Branch branch = new Branch();
            branch.setId(1L);
            branch.setName("Chennai");
            return branch;
        }

        private static Department department() {
            Department department = new Department();
            department.setId(2L);
            department.setName("Engineering");
            return department;
        }

        private static Designation designation() {
            Designation designation = new Designation();
            designation.setId(3L);
            designation.setTitle("Developer");
            return designation;
        }

        private Employee employee() {
            Employee employee = new Employee();
            employee.setId(10L);
            employee.setEmployeeCode("EMP-10");
            employee.setFirstName("Ada");
            employee.setLastName("Lovelace");
            employee.setJoiningDate(MONDAY.minusMonths(1));
            employee.setStatus(EmploymentStatus.ACTIVE);
            employee.setBranch(branch);
            employee.setDepartment(department);
            employee.setDesignation(designation);
            return employee;
        }
    }
}
