package com.payroll.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.payroll.backend.domain.Department;
import com.payroll.backend.domain.Designation;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.Holiday;
import com.payroll.backend.domain.LeaveRequest;
import com.payroll.backend.domain.PayrollEntry;
import com.payroll.backend.domain.PayrollRun;
import com.payroll.backend.domain.ReimbursementRequest;
import com.payroll.backend.domain.SalaryComponent;
import com.payroll.backend.domain.WeekOffAssignment;
import com.payroll.backend.domain.Branch;
import com.payroll.backend.domain.AttendanceRecord;
import com.payroll.backend.domain.enums.WeekOffAssignmentType;
import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.domain.enums.LeaveStatus;
import com.payroll.backend.domain.enums.LeaveType;
import com.payroll.backend.domain.enums.PayrollRunStatus;
import com.payroll.backend.domain.enums.SalaryComponentCategory;
import com.payroll.backend.domain.enums.SalaryValueType;
import com.payroll.backend.dto.payroll.PayrollRunCreateRequest;
import com.payroll.backend.dto.settings.CompanySettingsResponse;
import com.payroll.backend.repository.AttendanceRecordRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.EmployeeTransferRequestRepository;
import com.payroll.backend.repository.EmployeeSalaryComponentRepository;
import com.payroll.backend.repository.HolidayRepository;
import com.payroll.backend.repository.LeaveRequestRepository;
import com.payroll.backend.repository.PayrollEntryRepository;
import com.payroll.backend.repository.PayrollRunRepository;
import com.payroll.backend.repository.SalaryComponentRepository;
import com.payroll.backend.repository.WeekOffAssignmentRepository;
import com.payroll.backend.repository.WeekOffExclusionRepository;
import com.payroll.backend.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PayrollServiceTest {

    private static final String ORG = "ORG";

    @Test
    void deductsApprovedUnpaidLeaveAndAddsApprovedReimbursementsTaxNeutrally() {
        PayrollRunRepository runRepository = mock(PayrollRunRepository.class);
        PayrollEntryRepository entryRepository = mock(PayrollEntryRepository.class);
        EmployeeRepository employeeRepository = mock(EmployeeRepository.class);
        EmployeeTransferRequestRepository transferRepository = mock(EmployeeTransferRequestRepository.class);
        EmployeeSalaryComponentRepository employeeComponentRepository = mock(EmployeeSalaryComponentRepository.class);
        SalaryComponentRepository componentRepository = mock(SalaryComponentRepository.class);
        AttendanceRecordRepository attendanceRepository = mock(AttendanceRecordRepository.class);
        LeaveRequestRepository leaveRepository = mock(LeaveRequestRepository.class);
        HolidayRepository holidayRepository = mock(HolidayRepository.class);
        WeekOffAssignmentRepository weekOffRepository = mock(WeekOffAssignmentRepository.class);
        WeekOffExclusionRepository weekOffExclusionRepository = mock(WeekOffExclusionRepository.class);
        SalaryService salaryService = mock(SalaryService.class);
        CurrentOrgService orgService = mock(CurrentOrgService.class);
        EmployeeAccessService accessService = mock(EmployeeAccessService.class);
        AuditService auditService = mock(AuditService.class);
        CompanySettingsService companySettingsService = mock(CompanySettingsService.class);
        PayrollLockService payrollLockService = mock(PayrollLockService.class);
        ReimbursementService reimbursementService = mock(ReimbursementService.class);
        EmployeeTransferService employeeTransferService = mock(EmployeeTransferService.class);
        ResignationService resignationService = mock(ResignationService.class);
        AtomicReference<List<PayrollEntry>> persistedEntries = new AtomicReference<>(List.of());

        PayrollService service = new PayrollService(
                runRepository, entryRepository, employeeRepository, transferRepository, employeeComponentRepository, componentRepository,
                attendanceRepository, leaveRepository, holidayRepository, weekOffRepository, weekOffExclusionRepository,
                salaryService, orgService, accessService, auditService, companySettingsService, payrollLockService,
                reimbursementService, employeeTransferService, resignationService, new ObjectMapper()
        );
        Employee employee = employee("EMP-1", LocalDate.of(2026, 1, 16));
        ReimbursementRequest reimbursement = new ReimbursementRequest();
        reimbursement.setId(99L);
        reimbursement.setEmployee(employee);
        reimbursement.setCategory("Travel");
        reimbursement.setAmount(new BigDecimal("1000.00"));
        LeaveRequest unpaidLeave = new LeaveRequest();
        unpaidLeave.setEmployee(employee);
        unpaidLeave.setLeaveType(LeaveType.UNPAID);
        unpaidLeave.setStatus(LeaveStatus.APPROVED);
        unpaidLeave.setStartDate(LocalDate.of(2026, 1, 20));
        unpaidLeave.setEndDate(LocalDate.of(2026, 1, 20));
        unpaidLeave.setLeaveMinutes(480);
        LeaveRequest pendingLeave = new LeaveRequest();
        pendingLeave.setEmployee(employee);
        pendingLeave.setLeaveType(LeaveType.ANNUAL);
        pendingLeave.setStatus(LeaveStatus.PENDING);
        pendingLeave.setStartDate(LocalDate.of(2026, 1, 23));
        pendingLeave.setEndDate(LocalDate.of(2026, 1, 23));
        Holiday holiday = holiday(employee, LocalDate.of(2026, 1, 18));
        WeekOffAssignment weeklyOff = weekOff(employee, LocalDate.of(2026, 1, 18));
        List<AttendanceRecord> attendance = new ArrayList<>();
        for (LocalDate date = LocalDate.of(2026, 1, 16); !date.isAfter(LocalDate.of(2026, 1, 31)); date = date.plusDays(1)) {
            // Jan 18 is a week off, Jan 20 has approved unpaid leave, Jan 21
            // is an unexcused absence, and Jan 22 is a three-hour shift.
            if (!date.equals(LocalDate.of(2026, 1, 18))
                    && !date.equals(LocalDate.of(2026, 1, 20))
                    && !date.equals(LocalDate.of(2026, 1, 21))) {
                attendance.add(date.equals(LocalDate.of(2026, 1, 22))
                        ? attendance(employee, date, LocalTime.of(12, 0))
                        : attendance(employee, date));
            }
        }

        when(orgService.orgCode()).thenReturn(ORG);
        when(transferRepository.findByOrgCodeAndStatusOrderByEffectiveDateAsc(any(), any())).thenReturn(List.of());
        when(reimbursementService.allocateApprovedToPayroll(any())).thenReturn(Map.of(employee.getId(), List.of(reimbursement)));
        when(companySettingsService.get()).thenReturn(settings());
        when(runRepository.existsByOrgCodeAndPeriodStartAndPeriodEnd(ORG, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31))).thenReturn(false);
        when(runRepository.save(any(PayrollRun.class))).thenAnswer(invocation -> {
            PayrollRun run = invocation.getArgument(0);
            if (run.getId() == null) run.setId(44L);
            return run;
        });
        when(employeeRepository.findPayrollEmployees(eq(ORG), anyList(), eq(LocalDate.of(2026, 1, 1)), eq(LocalDate.of(2026, 1, 31))))
                .thenReturn(List.of(employee));
        when(componentRepository.findByOrgCodeOrderByCategoryAscNameAsc(ORG)).thenReturn(List.of(
                component("BASIC", SalaryComponentCategory.EARNING, "100"),
                component("PF", SalaryComponentCategory.DEDUCTION, "10")
        ));
        when(employeeComponentRepository.findSalaryReportComponents(ORG)).thenReturn(List.of());
        when(attendanceRepository.findByOrgCodeAndAttendanceDateBetweenOrderByAttendanceDateDesc(ORG, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31)))
                .thenReturn(attendance);
        when(leaveRepository.findApprovedOverlapping(ORG, LeaveStatus.APPROVED, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31)))
                .thenReturn(List.of(unpaidLeave));
        when(leaveRepository.findByOrgCodeAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                ORG, LeaveStatus.PENDING, LocalDate.of(2026, 1, 31), LocalDate.of(2026, 1, 1)
        )).thenReturn(List.of(pendingLeave));
        when(holidayRepository.findForCalendarReport(ORG, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31))).thenReturn(List.of(holiday));
        when(weekOffRepository.findForCalendarReport(eq(ORG), anyList(), any(), eq(LocalDate.of(2026, 1, 1)), eq(LocalDate.of(2026, 1, 31))))
                .thenReturn(List.of(weeklyOff));
        when(weekOffExclusionRepository.findForCalendarReport(ORG, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31))).thenReturn(List.of());
        when(entryRepository.saveAll(anyList())).thenAnswer(invocation -> {
            persistedEntries.set(List.copyOf(invocation.getArgument(0)));
            return persistedEntries.get();
        });
        when(entryRepository.findRunEntries(ORG, 44L)).thenAnswer(ignored -> persistedEntries.get());
        doNothing().when(salaryService).ensureDefaultComponents();
        doNothing().when(auditService).log(any(), any(), any(), any());

        var response = service.create(new PayrollRunCreateRequest(2026, 1), hrPrincipal());

        assertThat(response.status()).isEqualTo(PayrollRunStatus.DRAFT);
        assertThat(response.periodStart()).isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(response.periodEnd()).isEqualTo(LocalDate.of(2026, 1, 31));
        assertThat(response.disbursementDate()).isEqualTo(LocalDate.of(2026, 2, 1));
        assertThat(pendingLeave.getStatus()).isEqualTo(LeaveStatus.CANCELLED);
        assertThat(response.employeeCount()).isEqualTo(1);
        assertThat(response.entries()).singleElement().satisfies(entry -> {
            assertThat(entry.eligibleDays()).isEqualByComparingTo("16.00");
            // Jan 18 is both a Sunday week off and a holiday. It is one paid
            // calendar day and one non-working day, never two days.
            assertThat(entry.workingDays()).isEqualByComparingTo("15.00");
            assertThat(entry.attendanceDays()).isEqualByComparingTo("12.38");
            assertThat(entry.unpaidLeaveDays()).isEqualByComparingTo("2.62");
            assertThat(entry.payableDays()).isEqualByComparingTo("13.38");
            assertThat(entry.grossEarnings()).isEqualByComparingTo("4316.13");
            assertThat(entry.totalDeductions()).isEqualByComparingTo("431.61");
            assertThat(entry.reimbursementAmount()).isEqualByComparingTo("1000.00");
            assertThat(entry.netPay()).isEqualByComparingTo("4884.52");
            assertThat(entry.componentLines()).anySatisfy(line -> {
                assertThat(line.category()).isEqualTo(SalaryComponentCategory.REIMBURSEMENT);
                assertThat(line.amount()).isEqualByComparingTo("1000.00");
            });
        });
    }

    private static CompanySettingsResponse settings() {
        return new CompanySettingsResponse(
                1L, "Example Org", null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, "INR", "Asia/Kolkata",
                31, "MONTHLY", 1, "MONDAY", null, Instant.now()
        );
    }

    private static UserPrincipal hrPrincipal() {
        return new UserPrincipal(7L, ORG, "hr", "hr@example.test", "HR User", "EMP-1", "",
                List.of(new SimpleGrantedAuthority("ROLE_HR")), true);
    }

    private static AttendanceRecord attendance(Employee employee, LocalDate date) {
        return attendance(employee, date, LocalTime.of(17, 0));
    }

    private static AttendanceRecord attendance(Employee employee, LocalDate date, LocalTime clockOut) {
        AttendanceRecord record = new AttendanceRecord();
        record.setEmployee(employee);
        record.setAttendanceDate(date);
        record.setClockInDate(date);
        record.setClockIn(LocalTime.of(9, 0));
        record.setClockOutDate(date);
        record.setClockOut(clockOut);
        return record;
    }

    private static Employee employee(String code, LocalDate joiningDate) {
        Branch branch = new Branch();
        branch.setId(10L);
        branch.setName("Chennai");
        Department department = new Department();
        department.setId(20L);
        department.setName("Engineering");
        Designation designation = new Designation();
        designation.setId(30L);
        designation.setTitle("Developer");
        Employee employee = new Employee();
        employee.setId(1L);
        employee.setEmployeeCode(code);
        employee.setFirstName("Ada");
        employee.setLastName("Lovelace");
        employee.setJoiningDate(joiningDate);
        employee.setBaseSalary(new BigDecimal("120000.00"));
        employee.setStatus(EmploymentStatus.ACTIVE);
        employee.setBranch(branch);
        employee.setDepartment(department);
        employee.setDesignation(designation);
        return employee;
    }

    private static Holiday holiday(Employee employee, LocalDate date) {
        Holiday holiday = new Holiday();
        holiday.setBranch(employee.getBranch());
        holiday.setDepartment(employee.getDepartment());
        holiday.setDesignation(employee.getDesignation());
        holiday.setHolidayDate(date);
        holiday.setTitle("Festival");
        return holiday;
    }

    private static WeekOffAssignment weekOff(Employee employee, LocalDate date) {
        WeekOffAssignment assignment = new WeekOffAssignment();
        assignment.setAssignmentType(WeekOffAssignmentType.EMPLOYEE_DATE);
        assignment.setEmployee(employee);
        assignment.setWeekOffDate(date);
        return assignment;
    }

    private static SalaryComponent component(String code, SalaryComponentCategory category, String percentage) {
        SalaryComponent component = new SalaryComponent();
        component.setId((long) code.hashCode());
        component.setName(code);
        component.setCode(code);
        component.setCategory(category);
        component.setValueType(SalaryValueType.PERCENTAGE);
        component.setDefaultValue(new BigDecimal(percentage));
        component.setEnabled(true);
        return component;
    }
}
