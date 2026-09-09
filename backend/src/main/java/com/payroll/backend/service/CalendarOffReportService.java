package com.payroll.backend.service;

import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.Holiday;
import com.payroll.backend.domain.WeekOffAssignment;
import com.payroll.backend.domain.WeekOffExclusion;
import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.domain.enums.WeekOffAssignmentType;
import com.payroll.backend.dto.report.CalendarOffReportRow;
import com.payroll.backend.dto.report.CalendarOffType;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.HolidayRepository;
import com.payroll.backend.repository.WeekOffAssignmentRepository;
import com.payroll.backend.repository.WeekOffExclusionRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CalendarOffReportService {

    private static final long MAX_REPORT_DAYS = 366;

    private final EmployeeRepository employeeRepository;
    private final HolidayRepository holidayRepository;
    private final WeekOffAssignmentRepository weekOffAssignmentRepository;
    private final WeekOffExclusionRepository weekOffExclusionRepository;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService employeeAccessService;

    /**
     * Resolves configuration rules into attendance-ready employee/date rows.
     * Employee date rules take precedence over employee weekly rules, which take
     * precedence over group weekly rules. Group exclusion dates affect only a
     * matching group weekly rule; they never suppress employee-specific rules.
     */
    @Transactional(readOnly = true)
    public List<CalendarOffReportRow> calendarOff(
            CalendarOffType type,
            LocalDate from,
            LocalDate to,
            Long branchId,
            Long departmentId,
            Long designationId,
            Long employeeId,
            UserPrincipal principal
    ) {
        validateRange(from, to);

        List<Long> managedEmployeeIds = employeeAccessService.managedEmployeeIds(principal);
        if (employeeAccessService.isLead(principal) && managedEmployeeIds.isEmpty()) {
            return List.of();
        }

        List<Employee> employees = employeeRepository.findCalendarReportEmployees(
                currentOrgService.orgCode(),
                EmploymentStatus.ACTIVE,
                branchId,
                departmentId,
                designationId,
                employeeId,
                employeeAccessService.branchScopeId(principal),
                managedEmployeeIds.isEmpty() ? List.of(-1L) : managedEmployeeIds,
                !managedEmployeeIds.isEmpty()
        );

        if (employees.isEmpty()) {
            return List.of();
        }

        return type == CalendarOffType.HOLIDAY
                ? holidayRows(employees, from, to)
                : weekOffRows(employees, from, to);
    }

    /**
     * Returns calendar-off days for the signed-in employee only. The employee
     * id is resolved on the server instead of being accepted from the client,
     * so personnel users cannot request another employee's calendar.
     */
    @Transactional(readOnly = true)
    public List<CalendarOffReportRow> myCalendarOff(
            CalendarOffType type,
            LocalDate from,
            LocalDate to,
            UserPrincipal principal
    ) {
        Employee employee = employeeAccessService.findCurrentEmployee(principal);
        return calendarOff(type, from, to, null, null, null, employee.getId(), principal);
    }

    private List<CalendarOffReportRow> holidayRows(List<Employee> employees, LocalDate from, LocalDate to) {
        Map<GroupDateKey, Holiday> holidays = new HashMap<>();
        holidayRepository.findForCalendarReport(currentOrgService.orgCode(), from, to)
                .forEach(holiday -> holidays.put(
                        groupDateKey(
                                holiday.getBranch().getId(),
                                holiday.getDepartment().getId(),
                                holiday.getDesignation().getId(),
                                holiday.getHolidayDate()
                        ),
                        holiday
                ));

        List<CalendarOffReportRow> rows = new ArrayList<>();
        for (Employee employee : employees) {
            if (employee.getBranch() == null) {
                continue;
            }
            for (LocalDate date = firstEmploymentDate(employee, from); !date.isAfter(to); date = date.plusDays(1)) {
                Holiday holiday = holidays.get(groupDateKey(
                        employee.getBranch().getId(),
                        employee.getDepartment().getId(),
                        employee.getDesignation().getId(),
                        date
                ));
                if (holiday != null) {
                    rows.add(row(employee, date, holiday.getTitle(), "Holiday rule"));
                }
            }
        }
        return sort(rows);
    }

    private List<CalendarOffReportRow> weekOffRows(List<Employee> employees, LocalDate from, LocalDate to) {
        List<WeekOffAssignment> rules = weekOffAssignmentRepository.findForCalendarReport(
                currentOrgService.orgCode(),
                List.of(WeekOffAssignmentType.GROUP_WEEKLY, WeekOffAssignmentType.EMPLOYEE_WEEKLY),
                WeekOffAssignmentType.EMPLOYEE_DATE,
                from,
                to
        );

        Map<EmployeeDateKey, WeekOffAssignment> employeeDates = new HashMap<>();
        Map<Long, Set<DayOfWeek>> employeeWeeklyDays = new HashMap<>();
        Set<GroupDayKey> groupWeeklyDays = new HashSet<>();
        for (WeekOffAssignment rule : rules) {
            if (rule.getAssignmentType() == WeekOffAssignmentType.EMPLOYEE_DATE && rule.getEmployee() != null) {
                employeeDates.put(new EmployeeDateKey(rule.getEmployee().getId(), rule.getWeekOffDate()), rule);
            } else if (rule.getAssignmentType() == WeekOffAssignmentType.EMPLOYEE_WEEKLY && rule.getEmployee() != null) {
                employeeWeeklyDays.computeIfAbsent(rule.getEmployee().getId(), ignored -> new HashSet<>()).add(rule.getDayOfWeek());
            } else if (rule.getAssignmentType() == WeekOffAssignmentType.GROUP_WEEKLY && rule.getBranch() != null) {
                groupWeeklyDays.add(groupDayKey(
                        rule.getBranch().getId(),
                        rule.getDepartment().getId(),
                        rule.getDesignation().getId(),
                        rule.getDayOfWeek()
                ));
            }
        }

        Set<GroupDateKey> groupExclusions = new HashSet<>();
        weekOffExclusionRepository.findForCalendarReport(currentOrgService.orgCode(), from, to)
                .forEach(exclusion -> groupExclusions.add(groupDateKey(
                        exclusion.getBranch().getId(),
                        exclusion.getDepartment().getId(),
                        exclusion.getDesignation().getId(),
                        exclusion.getExcludedDate()
                )));

        List<CalendarOffReportRow> rows = new ArrayList<>();
        for (Employee employee : employees) {
            if (employee.getBranch() == null) {
                continue;
            }
            GroupDayKey employeeGroup = groupDayKey(
                    employee.getBranch().getId(),
                    employee.getDepartment().getId(),
                    employee.getDesignation().getId(),
                    null
            );
            for (LocalDate date = firstEmploymentDate(employee, from); !date.isAfter(to); date = date.plusDays(1)) {
                WeekOffAssignment employeeDate = employeeDates.get(new EmployeeDateKey(employee.getId(), date));
                if (employeeDate != null) {
                    rows.add(row(employee, date, "Week off", "Employee date"));
                    continue;
                }
                if (employeeWeeklyDays.getOrDefault(employee.getId(), Set.of()).contains(date.getDayOfWeek())) {
                    rows.add(row(employee, date, "Week off", "Employee weekly"));
                    continue;
                }
                GroupDayKey groupDay = new GroupDayKey(employeeGroup.branchId(), employeeGroup.departmentId(), employeeGroup.designationId(), date.getDayOfWeek());
                GroupDateKey groupDate = groupDateKey(employeeGroup.branchId(), employeeGroup.departmentId(), employeeGroup.designationId(), date);
                if (groupWeeklyDays.contains(groupDay) && !groupExclusions.contains(groupDate)) {
                    rows.add(row(employee, date, "Week off", "Group weekly"));
                }
            }
        }
        return sort(rows);
    }

    private LocalDate firstEmploymentDate(Employee employee, LocalDate from) {
        return employee.getJoiningDate() != null && employee.getJoiningDate().isAfter(from)
                ? employee.getJoiningDate()
                : from;
    }

    private List<CalendarOffReportRow> sort(List<CalendarOffReportRow> rows) {
        return rows.stream()
                .sorted(Comparator.comparing(CalendarOffReportRow::date)
                        .thenComparing(CalendarOffReportRow::employeeName)
                        .thenComparing(CalendarOffReportRow::employeeCode))
                .toList();
    }

    private CalendarOffReportRow row(Employee employee, LocalDate date, String calendarOff, String appliedVia) {
        return new CalendarOffReportRow(
                date,
                date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                employee.getId(),
                employee.getEmployeeCode(),
                fullName(employee),
                employee.getBranch() == null ? null : employee.getBranch().getId(),
                employee.getBranch() == null ? null : employee.getBranch().getName(),
                employee.getDepartment().getId(),
                employee.getDepartment().getName(),
                employee.getDesignation().getId(),
                employee.getDesignation().getTitle(),
                calendarOff,
                appliedVia
        );
    }

    private String fullName(Employee employee) {
        return java.util.stream.Stream.of(employee.getFirstName(), employee.getMiddleName(), employee.getLastName())
                .filter(value -> value != null && !value.isBlank())
                .reduce((left, right) -> left + " " + right)
                .orElse(employee.getEmployeeCode());
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new BadRequestException("From date and to date are required");
        }
        if (to.isBefore(from)) {
            throw new BadRequestException("To date must be on or after from date");
        }
        if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_REPORT_DAYS) {
            throw new BadRequestException("Calendar off report supports a maximum date range of 366 days");
        }
    }

    private GroupDateKey groupDateKey(Long branchId, Long departmentId, Long designationId, LocalDate date) {
        return new GroupDateKey(branchId, departmentId, designationId, date);
    }

    private GroupDayKey groupDayKey(Long branchId, Long departmentId, Long designationId, DayOfWeek dayOfWeek) {
        return new GroupDayKey(branchId, departmentId, designationId, dayOfWeek);
    }

    private record GroupDateKey(Long branchId, Long departmentId, Long designationId, LocalDate date) { }
    private record GroupDayKey(Long branchId, Long departmentId, Long designationId, DayOfWeek day) { }
    private record EmployeeDateKey(Long employeeId, LocalDate date) { }
}
