package com.payroll.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.payroll.backend.domain.AttendanceRecord;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.EmployeeSalaryComponent;
import com.payroll.backend.domain.Holiday;
import com.payroll.backend.domain.LeaveRequest;
import com.payroll.backend.domain.PayrollEntry;
import com.payroll.backend.domain.PayrollRun;
import com.payroll.backend.domain.SalaryComponent;
import com.payroll.backend.domain.WeekOffAssignment;
import com.payroll.backend.domain.WeekOffExclusion;
import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.domain.enums.LeaveStatus;
import com.payroll.backend.domain.enums.LeaveType;
import com.payroll.backend.domain.enums.PayrollRunStatus;
import com.payroll.backend.domain.enums.SalaryComponentCategory;
import com.payroll.backend.domain.enums.SalaryValueType;
import com.payroll.backend.domain.enums.WeekOffAssignmentType;
import com.payroll.backend.dto.payroll.PayrollComponentLineResponse;
import com.payroll.backend.dto.payroll.PayrollEntryResponse;
import com.payroll.backend.dto.payroll.PayrollRunCreateRequest;
import com.payroll.backend.dto.payroll.PayrollRunResponse;
import com.payroll.backend.dto.salary.SalaryRevisionComponentSnapshot;
import com.payroll.backend.dto.settings.CompanySettingsResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.AttendanceRecordRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.EmployeeSalaryComponentRepository;
import com.payroll.backend.repository.HolidayRepository;
import com.payroll.backend.repository.LeaveRequestRepository;
import com.payroll.backend.repository.PayrollEntryRepository;
import com.payroll.backend.repository.PayrollRunRepository;
import com.payroll.backend.repository.SalaryComponentRepository;
import com.payroll.backend.repository.WeekOffAssignmentRepository;
import com.payroll.backend.repository.WeekOffExclusionRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Creates immutable monthly payroll snapshots. Salary structures can safely be
 * changed after a run: entries retain every amount and component line used at
 * the time the run was generated.
 */
@Service
@RequiredArgsConstructor
public class PayrollService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal STANDARD_WORKDAY_MINUTES = BigDecimal.valueOf(480);
    private static final TypeReference<List<PayrollComponentLineResponse>> COMPONENT_LINES_TYPE = new TypeReference<>() { };

    private final PayrollRunRepository payrollRunRepository;
    private final PayrollEntryRepository payrollEntryRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeSalaryComponentRepository employeeSalaryComponentRepository;
    private final SalaryComponentRepository salaryComponentRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final HolidayRepository holidayRepository;
    private final WeekOffAssignmentRepository weekOffAssignmentRepository;
    private final WeekOffExclusionRepository weekOffExclusionRepository;
    private final SalaryService salaryService;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService employeeAccessService;
    private final AuditService auditService;
    private final CompanySettingsService companySettingsService;
    private final PayrollLockService payrollLockService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<PayrollRunResponse> runs() {
        return payrollRunRepository.findByOrgCodeOrderByPeriodStartDesc(currentOrgService.orgCode())
                .stream().map(run -> toRunResponse(run, List.of())).toList();
    }

    @Transactional(readOnly = true)
    public PayrollRunResponse run(Long id) {
        PayrollRun run = findRun(id);
        return toRunResponse(run, entriesForRun(run));
    }

    @Transactional
    public PayrollRunResponse create(PayrollRunCreateRequest request) {
        String orgCode = currentOrgService.orgCode();
        CompanySettingsResponse settings = companySettingsService.get();
        PayrollPeriod period = resolvePeriod(request, settings);
        if (payrollRunRepository.existsByOrgCodeAndPeriodStartAndPeriodEnd(orgCode, period.start(), period.end())) {
            throw new BadRequestException("A payroll run already exists for this payroll period");
        }
        payrollLockService.assertUnlocked(period.start(), period.end());

        PayrollRun run = new PayrollRun();
        run.setOrgCode(orgCode);
        run.setPeriodYear(period.end().getYear());
        run.setPeriodMonth(period.end().getMonthValue());
        run.setPeriodStart(period.start());
        run.setPeriodEnd(period.end());
        run.setPayrollFrequency(period.frequency());
        run.setDisbursementDate(nextDisbursementDate(period.end(), settings.payrollDisbursementDay()));
        run.setStatus(PayrollRunStatus.DRAFT);
        PayrollRun saved = payrollRunRepository.save(run);
        calculate(saved);
        auditService.log("PAYROLL_RUN_CREATED", "PayrollRun", saved.getId(), period.start() + " to " + period.end());
        return toRunResponse(saved, entriesForRun(saved));
    }

    @Transactional
    public PayrollRunResponse recalculate(Long id) {
        PayrollRun run = findRun(id);
        requireStatus(run, PayrollRunStatus.DRAFT, "Only draft payroll can be recalculated");
        payrollLockService.assertUnlocked(run.getPeriodStart(), run.getPeriodEnd());
        payrollEntryRepository.deleteByOrgCodeAndPayrollRunId(currentOrgService.orgCode(), run.getId());
        payrollEntryRepository.flush();
        calculate(run);
        auditService.log("PAYROLL_RUN_RECALCULATED", "PayrollRun", run.getId(), run.getPeriodStart().toString());
        return toRunResponse(run, entriesForRun(run));
    }

    @Transactional
    public PayrollRunResponse approve(Long id, UserPrincipal principal) {
        PayrollRun run = findRun(id);
        requireStatus(run, PayrollRunStatus.DRAFT, "Only a draft payroll can be approved");
        if (run.getEmployeeCount() == null || run.getEmployeeCount() == 0) {
            throw new BadRequestException("Payroll with no employees cannot be approved");
        }
        run.setStatus(PayrollRunStatus.APPROVED);
        run.setApprovedBy(principal.email());
        run.setApprovedAt(Instant.now());
        payrollRunRepository.save(run);
        auditService.log("PAYROLL_RUN_APPROVED", "PayrollRun", run.getId(), run.getPeriodStart().toString());
        return toRunResponse(run, entriesForRun(run));
    }

    @Transactional
    public PayrollRunResponse lock(Long id, UserPrincipal principal) {
        PayrollRun run = findRun(id);
        requireStatus(run, PayrollRunStatus.APPROVED, "Approve payroll before locking it");
        run.setStatus(PayrollRunStatus.LOCKED);
        run.setLockedBy(principal.email());
        run.setLockedAt(Instant.now());
        payrollRunRepository.save(run);
        auditService.log("PAYROLL_RUN_LOCKED", "PayrollRun", run.getId(), run.getPeriodStart().toString());
        return toRunResponse(run, entriesForRun(run));
    }

    @Transactional
    public void deleteDraft(Long id) {
        PayrollRun run = findRun(id);
        requireStatus(run, PayrollRunStatus.DRAFT, "Only a draft payroll can be deleted");
        payrollEntryRepository.deleteByOrgCodeAndPayrollRunId(currentOrgService.orgCode(), run.getId());
        payrollRunRepository.delete(run);
        auditService.log("PAYROLL_RUN_DELETED", "PayrollRun", id, run.getPeriodStart().toString());
    }

    @Transactional(readOnly = true)
    public PayrollEntryResponse entry(Long entryId) {
        PayrollEntry entry = payrollEntryRepository.findEntry(currentOrgService.orgCode(), entryId)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll entry not found"));
        return toEntryResponse(entry);
    }

    @Transactional(readOnly = true)
    public List<PayrollEntryResponse> myPayslips(UserPrincipal principal) {
        Employee employee = employeeAccessService.findCurrentEmployee(principal);
        return payrollEntryRepository.findEmployeePayslips(
                        currentOrgService.orgCode(),
                        employee.getId(),
                        List.of(PayrollRunStatus.APPROVED, PayrollRunStatus.LOCKED)
                ).stream().map(this::toEntryResponse).toList();
    }

    private void calculate(PayrollRun run) {
        String orgCode = currentOrgService.orgCode();
        cancelPendingLeaves(run);
        salaryService.ensureDefaultComponents();
        List<Employee> employees = employeeRepository.findPayrollEmployees(
                orgCode,
                List.of(EmploymentStatus.ACTIVE, EmploymentStatus.ON_LEAVE, EmploymentStatus.PROBATION),
                run.getPeriodStart(),
                run.getPeriodEnd()
        );
        List<SalaryComponent> catalog = salaryComponentRepository.findByOrgCodeOrderByCategoryAscNameAsc(orgCode);
        Map<Long, Map<Long, EmployeeSalaryComponent>> configuredByEmployee = employeeSalaryComponentRepository
                .findSalaryReportComponents(orgCode).stream().collect(Collectors.groupingBy(
                        component -> component.getEmployee().getId(),
                        Collectors.toMap(component -> component.getComponent().getId(), component -> component, (left, right) -> left)
                ));
        Map<Long, SalaryService.PayrollSalarySnapshot> salaryRevisionsByEmployee = salaryService.payrollSalarySnapshots(
                employees.stream().map(Employee::getId).toList(), run.getPeriodStart());
        Map<Long, Map<LocalDate, BigDecimal>> attendanceByEmployee = attendanceByEmployee(run);
        Map<Long, List<LeaveRequest>> leavesByEmployee = leavesByEmployee(run);
        PayrollCalendar calendar = new PayrollCalendar(orgCode, run.getPeriodStart(), run.getPeriodEnd());

        List<PayrollEntry> entries = new ArrayList<>();
        for (Employee employee : employees) {
            LocalDate employmentStart = employmentStart(employee, run.getPeriodStart());
            LocalDate employmentEnd = employmentEnd(employee, run.getPeriodEnd());
            if (employmentStart.isAfter(employmentEnd)) {
                continue;
            }

            AttendanceSummary attendance = attendanceSummary(employee, employmentStart, employmentEnd,
                    attendanceByEmployee.getOrDefault(employee.getId(), Map.of()), calendar);
            LeaveSummary leave = leaveSummary(employee, employmentStart, employmentEnd,
                    leavesByEmployee.getOrDefault(employee.getId(), List.of()));
            // The set behind payableCalendarDays is date-based. A holiday and a
            // week off on the same date therefore remain one paid calendar day.
            BigDecimal eligibleDays = attendance.payableCalendarDays();
            BigDecimal unpaidAbsenceDays = attendance.workingDays()
                    .subtract(attendance.attendanceDays())
                    .subtract(leave.paidLeaveDays())
                    .subtract(leave.unpaidLeaveDays())
                    .max(BigDecimal.ZERO);
            BigDecimal unpaidDays = leave.unpaidLeaveDays().add(unpaidAbsenceDays).min(eligibleDays);
            BigDecimal payableDays = eligibleDays.subtract(unpaidDays).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
            BigDecimal proration = payableDays.divide(BigDecimal.valueOf(periodDays(run)), 8, RoundingMode.HALF_UP);
            SalaryService.PayrollSalarySnapshot salarySnapshot = salaryRevisionsByEmployee.get(employee.getId());
            BigDecimal annualCtc = salarySnapshot == null ? employee.getBaseSalary() : salarySnapshot.ctc();
            List<ResolvedComponent> resolvedSalaryComponents = salarySnapshot == null
                    ? resolvedComponents(employee, catalog, configuredByEmployee.getOrDefault(employee.getId(), Map.of()))
                    : resolvedComponents(salarySnapshot.components());

            List<PayrollComponentLineResponse> lines = new ArrayList<>();
            BigDecimal gross = ZERO;
            BigDecimal employerContributions = ZERO;
            for (ResolvedComponent component : resolvedSalaryComponents) {
                if (!component.enabled()) {
                    continue;
                }
                BigDecimal amount = annualAmount(component, annualCtc)
                        .divide(BigDecimal.valueOf(payPeriodsPerYear(run)), 8, RoundingMode.HALF_UP)
                        .multiply(proration).setScale(2, RoundingMode.HALF_UP);
                if (component.category() == SalaryComponentCategory.EARNING) {
                    gross = gross.add(amount);
                    lines.add(line(component, amount));
                } else if (component.category() == SalaryComponentCategory.EMPLOYER_CONTRIBUTION) {
                    employerContributions = employerContributions.add(amount);
                    lines.add(line(component, amount));
                }
            }

            BigDecimal deductions = ZERO;
            BigDecimal remainingForDeductions = gross;
            for (ResolvedComponent component : resolvedSalaryComponents) {
                if (!component.enabled() || component.category() != SalaryComponentCategory.DEDUCTION) {
                    continue;
                }
                BigDecimal requested = annualAmount(component, annualCtc)
                        .divide(BigDecimal.valueOf(payPeriodsPerYear(run)), 8, RoundingMode.HALF_UP)
                        .multiply(proration).setScale(2, RoundingMode.HALF_UP);
                // A payslip must never produce a negative transfer amount. Components are
                // applied in stable catalog order and capped at the gross available to pay.
                BigDecimal amount = requested.min(remainingForDeductions);
                remainingForDeductions = remainingForDeductions.subtract(amount);
                deductions = deductions.add(amount);
                lines.add(line(component, amount));
            }

            PayrollEntry entry = new PayrollEntry();
            entry.setOrgCode(orgCode);
            entry.setPayrollRun(run);
            entry.setEmployee(employee);
            entry.setEmployeeCode(employee.getEmployeeCode());
            entry.setEmployeeName(fullName(employee));
            entry.setDepartmentName(employee.getDepartment() == null ? null : employee.getDepartment().getName());
            entry.setDesignationTitle(employee.getDesignation() == null ? null : employee.getDesignation().getTitle());
            entry.setBankAccountNumber(employee.getBankAccountNumber());
            entry.setAnnualCtc(money(annualCtc));
            entry.setPeriodDays(periodDays(run));
            entry.setEligibleDays(eligibleDays);
            entry.setWorkingDays(attendance.workingDays());
            entry.setAttendanceDays(attendance.attendanceDays());
            entry.setPaidLeaveDays(leave.paidLeaveDays());
            entry.setUnpaidLeaveDays(unpaidDays);
            entry.setPayableDays(payableDays);
            entry.setGrossEarnings(money(gross));
            entry.setTotalDeductions(money(deductions));
            entry.setEmployerContributions(money(employerContributions));
            entry.setNetPay(money(gross.subtract(deductions)));
            entry.setComponentLinesJson(writeLines(lines));
            entries.add(entry);
        }
        payrollEntryRepository.saveAll(entries);
        updateTotals(run, entries);
        payrollRunRepository.save(run);
    }

    private PayrollPeriod resolvePeriod(PayrollRunCreateRequest request, CompanySettingsResponse settings) {
        LocalDate anchor = request.anchorDate() == null
                ? YearMonth.of(request.year(), request.month()).atEndOfMonth()
                : request.anchorDate();
        String frequency = settings.payrollFrequency() == null ? "MONTHLY" : settings.payrollFrequency().trim().toUpperCase();
        DayOfWeek weekStart = settings.weekStartDay() == null ? DayOfWeek.MONDAY
                : DayOfWeek.valueOf(settings.weekStartDay().trim().toUpperCase());

        return switch (frequency) {
            case "WEEKLY" -> {
                LocalDate start = anchor.with(TemporalAdjusters.previousOrSame(weekStart));
                yield new PayrollPeriod(start, start.plusDays(6), frequency);
            }
            case "BIWEEKLY" -> {
                LocalDate weekOfAnchor = anchor.with(TemporalAdjusters.previousOrSame(weekStart));
                LocalDate cycleAnchor = LocalDate.of(1970, 1, 5).with(TemporalAdjusters.nextOrSame(weekStart));
                long cycle = Math.floorDiv(ChronoUnit.DAYS.between(cycleAnchor, weekOfAnchor), 14);
                LocalDate start = cycleAnchor.plusDays(cycle * 14);
                yield new PayrollPeriod(start, start.plusDays(13), frequency);
            }
            default -> {
                int cutoffDay = settings.payrollCutoffDay();
                LocalDate cutoff = cutoffDate(YearMonth.from(anchor), cutoffDay);
                LocalDate end = anchor.isAfter(cutoff)
                        ? cutoffDate(YearMonth.from(anchor).plusMonths(1), cutoffDay)
                        : cutoff;
                LocalDate start = cutoffDate(YearMonth.from(end).minusMonths(1), cutoffDay).plusDays(1);
                yield new PayrollPeriod(start, end, "MONTHLY");
            }
        };
    }

    private LocalDate cutoffDate(YearMonth month, int configuredDay) {
        return month.atDay(Math.min(configuredDay, month.lengthOfMonth()));
    }

    private LocalDate nextDisbursementDate(LocalDate periodEnd, int configuredDay) {
        YearMonth month = YearMonth.from(periodEnd);
        LocalDate candidate = cutoffDate(month, configuredDay);
        return candidate.isAfter(periodEnd) ? candidate : cutoffDate(month.plusMonths(1), configuredDay);
    }

    private int payPeriodsPerYear(PayrollRun run) {
        return switch (run.getPayrollFrequency() == null ? "MONTHLY" : run.getPayrollFrequency()) {
            case "WEEKLY" -> 52;
            case "BIWEEKLY" -> 26;
            default -> 12;
        };
    }

    private int periodDays(PayrollRun run) {
        return Math.toIntExact(ChronoUnit.DAYS.between(run.getPeriodStart(), run.getPeriodEnd()) + 1);
    }

    private void cancelPendingLeaves(PayrollRun run) {
        List<LeaveRequest> pending = leaveRequestRepository
                .findByOrgCodeAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                        currentOrgService.orgCode(),
                        LeaveStatus.PENDING,
                        run.getPeriodEnd(),
                        run.getPeriodStart()
                );
        if (pending == null || pending.isEmpty()) {
            return;
        }
        Instant cancelledAt = Instant.now();
        String reason = "Automatically cancelled because payroll was processed for "
                + run.getPeriodStart() + " to " + run.getPeriodEnd() + ".";
        pending.forEach(leave -> {
            leave.setStatus(LeaveStatus.CANCELLED);
            leave.setReviewerComment(reason);
            leave.setReviewedAt(cancelledAt);
        });
        leaveRequestRepository.saveAll(pending);
        auditService.log("PAYROLL_PENDING_LEAVES_CANCELLED", "PayrollRun", run.getId(), "count=" + pending.size());
    }

    private Map<Long, Map<LocalDate, BigDecimal>> attendanceByEmployee(PayrollRun run) {
        Map<Long, Map<LocalDate, BigDecimal>> days = new HashMap<>();
        for (AttendanceRecord record : attendanceRecordRepository.findByOrgCodeAndAttendanceDateBetweenOrderByAttendanceDateDesc(
                currentOrgService.orgCode(), run.getPeriodStart(), run.getPeriodEnd())) {
            if (record.getClockIn() != null) {
                days.computeIfAbsent(record.getEmployee().getId(), ignored -> new HashMap<>())
                        .put(record.getAttendanceDate(), attendanceCredit(record));
            }
        }
        return days;
    }

    private Map<Long, List<LeaveRequest>> leavesByEmployee(PayrollRun run) {
        return leaveRequestRepository.findApprovedOverlapping(
                        currentOrgService.orgCode(), LeaveStatus.APPROVED, run.getPeriodStart(), run.getPeriodEnd())
                .stream().collect(Collectors.groupingBy(leave -> leave.getEmployee().getId()));
    }

    private AttendanceSummary attendanceSummary(
            Employee employee,
            LocalDate start,
            LocalDate end,
            Map<LocalDate, BigDecimal> attendanceByDate,
            PayrollCalendar calendar
    ) {
        int working = 0;
        BigDecimal attendance = ZERO;
        Set<LocalDate> payableCalendarDates = new HashSet<>();
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            // A date is paid once, regardless of how many calendar-off rules
            // match it (for example, a holiday that is also a weekly off).
            payableCalendarDates.add(date);
            if (!calendar.isHoliday(employee, date) && !calendar.isWeekOff(employee, date)) {
                working++;
                attendance = attendance.add(attendanceByDate.getOrDefault(date, ZERO).min(BigDecimal.ONE));
            }
        }
        return new AttendanceSummary(dayNumber(payableCalendarDates.size()), dayNumber(working), attendance.setScale(2, RoundingMode.HALF_UP));
    }

    private BigDecimal attendanceCredit(AttendanceRecord record) {
        if (record.getClockIn() == null || record.getClockOut() == null) {
            return ZERO;
        }
        LocalDate clockInDate = record.getClockInDate() == null ? record.getAttendanceDate() : record.getClockInDate();
        LocalDate clockOutDate = record.getClockOutDate() == null ? clockInDate : record.getClockOutDate();
        long workedMinutes = Duration.between(
                LocalDateTime.of(clockInDate, record.getClockIn()),
                LocalDateTime.of(clockOutDate, record.getClockOut())
        ).toMinutes();
        if (workedMinutes <= 0) {
            return ZERO;
        }
        return BigDecimal.valueOf(Math.min(workedMinutes, STANDARD_WORKDAY_MINUTES.longValue()))
                .divide(STANDARD_WORKDAY_MINUTES, 4, RoundingMode.HALF_UP);
    }

    private LeaveSummary leaveSummary(
            Employee employee,
            LocalDate employmentStart,
            LocalDate employmentEnd,
            List<LeaveRequest> leaves
    ) {
        long paidMinutes = 0;
        long unpaidMinutes = 0;
        for (LeaveRequest leave : leaves) {
            // The leave may start in a previous month. Resolve its full date
            // range so holiday/week-off treatment is correct before its minutes
            // are allocated to this payroll period.
            PayrollCalendar leaveCalendar = new PayrollCalendar(
                    currentOrgService.orgCode(), leave.getStartDate(), leave.getEndDate());
            long minutes = proratedLeaveMinutes(leave, employee, employmentStart, employmentEnd, leaveCalendar);
            if (leave.getLeaveType() == LeaveType.UNPAID) {
                unpaidMinutes += minutes;
            } else {
                paidMinutes += minutes;
            }
        }
        return new LeaveSummary(daysForMinutes(paidMinutes), daysForMinutes(unpaidMinutes));
    }

    private long proratedLeaveMinutes(
            LeaveRequest leave,
            Employee employee,
            LocalDate periodStart,
            LocalDate periodEnd,
            PayrollCalendar calendar
    ) {
        LocalDate overlapStart = leave.getStartDate().isAfter(periodStart) ? leave.getStartDate() : periodStart;
        LocalDate overlapEnd = leave.getEndDate().isBefore(periodEnd) ? leave.getEndDate() : periodEnd;
        if (overlapStart.isAfter(overlapEnd) || leave.getLeaveMinutes() == null || leave.getLeaveMinutes() <= 0) {
            return 0;
        }
        long totalDates = countLeaveWorkingDates(employee, leave.getStartDate(), leave.getEndDate(), calendar);
        long overlappingDates = countLeaveWorkingDates(employee, overlapStart, overlapEnd, calendar);
        if (totalDates == 0 || overlappingDates == 0) {
            return 0;
        }
        return BigDecimal.valueOf(leave.getLeaveMinutes())
                .multiply(BigDecimal.valueOf(overlappingDates))
                .divide(BigDecimal.valueOf(totalDates), 0, RoundingMode.HALF_UP)
                .longValue();
    }

    private long countLeaveWorkingDates(Employee employee, LocalDate from, LocalDate to, PayrollCalendar calendar) {
        long dates = 0;
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            if (!calendar.isHoliday(employee, date) && !calendar.isWeekOff(employee, date)) {
                dates++;
            }
        }
        return dates;
    }

    private List<ResolvedComponent> resolvedComponents(
            Employee employee,
            List<SalaryComponent> catalog,
            Map<Long, EmployeeSalaryComponent> configured
    ) {
        return catalog.stream().map(component -> {
            EmployeeSalaryComponent employeeComponent = configured.get(component.getId());
            if (employeeComponent != null) {
                return new ResolvedComponent(component.getName(), component.getCode(), component.getCategory(),
                        employeeComponent.getValueType(), employeeComponent.getValue(), employeeComponent.isEnabled());
            }
            return new ResolvedComponent(component.getName(), component.getCode(), component.getCategory(),
                    component.getValueType(), component.getDefaultValue(),
                    component.isEnabled() && component.getCategory() != SalaryComponentCategory.EMPLOYER_CONTRIBUTION);
        }).toList();
    }

    private List<ResolvedComponent> resolvedComponents(List<SalaryRevisionComponentSnapshot> components) {
        return components.stream()
                .map(component -> new ResolvedComponent(component.name(), component.code(), component.category(),
                        component.valueType(), component.value(), component.enabled()))
                .toList();
    }

    private BigDecimal annualAmount(ResolvedComponent component, BigDecimal annualCtc) {
        BigDecimal base = annualCtc == null ? BigDecimal.ZERO : annualCtc;
        return component.valueType() == SalaryValueType.PERCENTAGE
                ? base.multiply(component.value()).divide(HUNDRED, 8, RoundingMode.HALF_UP)
                : component.value();
    }

    private PayrollComponentLineResponse line(ResolvedComponent component, BigDecimal amount) {
        return new PayrollComponentLineResponse(component.name(), component.code(), component.category(), money(amount));
    }

    private void updateTotals(PayrollRun run, List<PayrollEntry> entries) {
        run.setEmployeeCount(entries.size());
        run.setGrossEarnings(sum(entries, PayrollEntry::getGrossEarnings));
        run.setTotalDeductions(sum(entries, PayrollEntry::getTotalDeductions));
        run.setEmployerContributions(sum(entries, PayrollEntry::getEmployerContributions));
        run.setNetPay(sum(entries, PayrollEntry::getNetPay));
    }

    private BigDecimal sum(List<PayrollEntry> entries, java.util.function.Function<PayrollEntry, BigDecimal> getter) {
        return money(entries.stream().map(getter).reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    private PayrollRun findRun(Long id) {
        return payrollRunRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll run not found"));
    }

    private void requireStatus(PayrollRun run, PayrollRunStatus expected, String message) {
        if (run.getStatus() != expected) {
            throw new BadRequestException(message);
        }
    }

    private List<PayrollEntryResponse> entriesForRun(PayrollRun run) {
        return payrollEntryRepository.findRunEntries(currentOrgService.orgCode(), run.getId())
                .stream().map(this::toEntryResponse).toList();
    }

    private PayrollRunResponse toRunResponse(PayrollRun run, List<PayrollEntryResponse> entries) {
        return new PayrollRunResponse(run.getId(), run.getPeriodYear(), run.getPeriodMonth(), run.getPeriodStart(),
                run.getPeriodEnd(), run.getPayrollFrequency(), run.getDisbursementDate(), run.getStatus(), run.getEmployeeCount(), money(run.getGrossEarnings()),
                money(run.getTotalDeductions()), money(run.getEmployerContributions()), money(run.getNetPay()),
                run.getApprovedBy(), run.getApprovedAt(), run.getLockedBy(), run.getLockedAt(), run.getCreatedAt(),
                run.getUpdatedAt(), entries);
    }

    private PayrollEntryResponse toEntryResponse(PayrollEntry entry) {
        PayrollRun run = entry.getPayrollRun();
        return new PayrollEntryResponse(entry.getId(), run.getId(), run.getPeriodYear(), run.getPeriodMonth(),
                entry.getEmployeeCode(), entry.getEmployeeName(), entry.getDepartmentName(), entry.getDesignationTitle(),
                entry.getBankAccountNumber(), money(entry.getAnnualCtc()), entry.getPeriodDays(), entry.getEligibleDays(),
                entry.getWorkingDays(), entry.getAttendanceDays(), entry.getPaidLeaveDays(), entry.getUnpaidLeaveDays(),
                entry.getPayableDays(), money(entry.getGrossEarnings()), money(entry.getTotalDeductions()),
                money(entry.getEmployerContributions()), money(entry.getNetPay()), readLines(entry.getComponentLinesJson()), entry.getCreatedAt());
    }

    private String writeLines(List<PayrollComponentLineResponse> lines) {
        try {
            return objectMapper.writeValueAsString(lines);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not store payroll component snapshot", exception);
        }
    }

    private List<PayrollComponentLineResponse> readLines(String json) {
        try {
            return objectMapper.readValue(json, COMPONENT_LINES_TYPE);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Payroll component snapshot is invalid", exception);
        }
    }

    private LocalDate employmentStart(Employee employee, LocalDate periodStart) {
        return employee.getJoiningDate().isAfter(periodStart) ? employee.getJoiningDate() : periodStart;
    }

    private LocalDate employmentEnd(Employee employee, LocalDate periodEnd) {
        return employee.getLastWorkingDate() != null && employee.getLastWorkingDate().isBefore(periodEnd)
                ? employee.getLastWorkingDate() : periodEnd;
    }

    private BigDecimal daysForMinutes(long minutes) {
        return BigDecimal.valueOf(minutes).divide(STANDARD_WORKDAY_MINUTES, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal dayNumber(long number) {
        return BigDecimal.valueOf(number).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private String fullName(Employee employee) {
        return java.util.stream.Stream.of(employee.getFirstName(), employee.getMiddleName(), employee.getLastName())
                .filter(value -> value != null && !value.isBlank()).collect(Collectors.joining(" "));
    }

    private record ResolvedComponent(
            String name, String code, SalaryComponentCategory category, SalaryValueType valueType, BigDecimal value, boolean enabled
    ) { }
    private record PayrollPeriod(LocalDate start, LocalDate end, String frequency) { }
    private record AttendanceSummary(BigDecimal payableCalendarDays, BigDecimal workingDays, BigDecimal attendanceDays) { }
    private record LeaveSummary(BigDecimal paidLeaveDays, BigDecimal unpaidLeaveDays) { }

    /** Mirrors calendar-off precedence used by leave and reports, without an N+1 lookup per day. */
    private final class PayrollCalendar {
        private final Set<GroupDateKey> holidays = new HashSet<>();
        private final Map<EmployeeDateKey, WeekOffAssignment> employeeDates = new HashMap<>();
        private final Map<Long, Set<DayOfWeek>> employeeWeeklyDays = new HashMap<>();
        private final Set<GroupDayKey> groupWeeklyDays = new HashSet<>();
        private final Set<GroupDateKey> groupExclusions = new HashSet<>();

        private PayrollCalendar(String orgCode, LocalDate from, LocalDate to) {
            for (Holiday holiday : holidayRepository.findForCalendarReport(orgCode, from, to)) {
                holidays.add(new GroupDateKey(holiday.getBranch().getId(), holiday.getDepartment().getId(),
                        holiday.getDesignation().getId(), holiday.getHolidayDate()));
            }
            for (WeekOffAssignment rule : weekOffAssignmentRepository.findForCalendarReport(orgCode,
                    List.of(WeekOffAssignmentType.GROUP_WEEKLY, WeekOffAssignmentType.EMPLOYEE_WEEKLY),
                    WeekOffAssignmentType.EMPLOYEE_DATE, from, to)) {
                if (rule.getAssignmentType() == WeekOffAssignmentType.EMPLOYEE_DATE && rule.getEmployee() != null) {
                    employeeDates.put(new EmployeeDateKey(rule.getEmployee().getId(), rule.getWeekOffDate()), rule);
                } else if (rule.getAssignmentType() == WeekOffAssignmentType.EMPLOYEE_WEEKLY && rule.getEmployee() != null) {
                    employeeWeeklyDays.computeIfAbsent(rule.getEmployee().getId(), ignored -> new HashSet<>()).add(rule.getDayOfWeek());
                } else if (rule.getAssignmentType() == WeekOffAssignmentType.GROUP_WEEKLY && rule.getBranch() != null) {
                    groupWeeklyDays.add(new GroupDayKey(rule.getBranch().getId(), rule.getDepartment().getId(),
                            rule.getDesignation().getId(), rule.getDayOfWeek()));
                }
            }
            for (WeekOffExclusion exclusion : weekOffExclusionRepository.findForCalendarReport(orgCode, from, to)) {
                groupExclusions.add(new GroupDateKey(exclusion.getBranch().getId(), exclusion.getDepartment().getId(),
                        exclusion.getDesignation().getId(), exclusion.getExcludedDate()));
            }
        }

        private boolean isHoliday(Employee employee, LocalDate date) {
            return employee.getBranch() != null && holidays.contains(new GroupDateKey(employee.getBranch().getId(),
                    employee.getDepartment().getId(), employee.getDesignation().getId(), date));
        }

        private boolean isWeekOff(Employee employee, LocalDate date) {
            if (employee.getBranch() == null) return false;
            if (employeeDates.containsKey(new EmployeeDateKey(employee.getId(), date))) return true;
            if (employeeWeeklyDays.getOrDefault(employee.getId(), Set.of()).contains(date.getDayOfWeek())) return true;
            GroupDayKey groupDay = new GroupDayKey(employee.getBranch().getId(), employee.getDepartment().getId(),
                    employee.getDesignation().getId(), date.getDayOfWeek());
            GroupDateKey groupDate = new GroupDateKey(employee.getBranch().getId(), employee.getDepartment().getId(),
                    employee.getDesignation().getId(), date);
            return groupWeeklyDays.contains(groupDay) && !groupExclusions.contains(groupDate);
        }
    }

    private record GroupDateKey(Long branchId, Long departmentId, Long designationId, LocalDate date) { }
    private record GroupDayKey(Long branchId, Long departmentId, Long designationId, DayOfWeek day) { }
    private record EmployeeDateKey(Long employeeId, LocalDate date) { }
}
