package com.payroll.backend.service;

import com.payroll.backend.domain.AppUser;
import com.payroll.backend.domain.AttendanceRecord;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.OvertimeRequest;
import com.payroll.backend.domain.PayrollRun;
import com.payroll.backend.domain.ShiftAssignment;
import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.domain.enums.OvertimePayRateType;
import com.payroll.backend.domain.enums.OvertimeStatus;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.overtime.OvertimeCreateRequest;
import com.payroll.backend.dto.overtime.OvertimeDecisionRequest;
import com.payroll.backend.dto.overtime.OvertimeResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.AppUserRepository;
import com.payroll.backend.repository.AttendanceRecordRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.OvertimeRequestRepository;
import com.payroll.backend.repository.ShiftAssignmentRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OvertimeService {

    private final OvertimeRequestRepository overtimeRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final AppUserRepository appUserRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService employeeAccessService;
    private final AuditService auditService;
    private final PayrollLockService payrollLockService;
    private final OvertimeCalculator overtimeCalculator;
    private final OvertimePolicyService overtimePolicyService;

    @Transactional(readOnly = true)
    public PageResponse<OvertimeResponse> search(
            String search, OvertimeStatus status, boolean mine, int page, int size, UserPrincipal principal
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "overtimeDate").and(Sort.by(Sort.Direction.DESC, "id")));
        Long employeeId = mine || employeeAccessService.isEmployee(principal)
                ? employeeAccessService.findCurrentEmployee(principal).getId() : null;
        Long branchId = employeeAccessService.branchScopeId(principal);
        List<Long> managedEmployeeIds = employeeAccessService.managedEmployeeIds(principal);
        if (!mine && employeeAccessService.isLead(principal) && managedEmployeeIds.isEmpty()) {
            return PageResponse.from(new PageImpl<OvertimeRequest>(List.of(), pageable, 0).map(this::toResponse));
        }
        return PageResponse.from(overtimeRequestRepository.search(
                currentOrgService.orgCode(), blankToNull(search), employeeId, branchId,
                managedEmployeeIds.isEmpty() ? List.of(-1L) : managedEmployeeIds,
                !mine && !managedEmployeeIds.isEmpty(), status, pageable
        ).map(this::toResponse));
    }

    @Transactional
    public OvertimeResponse create(OvertimeCreateRequest request, UserPrincipal principal) {
        Employee employee = requestedEmployee(request.employeeId(), principal);
        if (employee.getStatus() == EmploymentStatus.TERMINATED || employee.getStatus() == EmploymentStatus.RESIGNED
                || (employee.getLastWorkingDate() != null && request.overtimeDate().isAfter(employee.getLastWorkingDate()))) {
            throw new BadRequestException("A separated employee cannot submit an overtime request");
        }
        if (request.overtimeDate().isAfter(LocalDate.now())) {
            throw new BadRequestException("Overtime cannot be requested for a future date");
        }
        overtimePolicyService.requireActivePolicy(employee);
        payrollLockService.assertUnlocked(request.overtimeDate());
        findShiftAssignment(employee.getId(), request.overtimeDate()).orElseThrow(() ->
                new BadRequestException("An overtime request requires a shift assignment for the selected date"));
        if (overtimeRequestRepository.existsByOrgCodeAndEmployeeIdAndOvertimeDateAndStatusIn(
                currentOrgService.orgCode(), employee.getId(), request.overtimeDate(),
                List.of(OvertimeStatus.PENDING, OvertimeStatus.APPROVED, OvertimeStatus.PAID)
        )) {
            throw new BadRequestException("A pending or approved overtime request already exists for this date");
        }

        OvertimeRequest overtime = new OvertimeRequest();
        overtime.setOrgCode(currentOrgService.orgCode());
        overtime.setEmployee(employee);
        overtime.setOvertimeDate(request.overtimeDate());
        overtime.setRequestedMinutes(request.requestedMinutes());
        overtime.setReason(blankToNull(request.reason()));
        overtime.setStatus(OvertimeStatus.PENDING);
        overtime.setRequestedBy(currentUser(principal));
        OvertimeRequest saved = overtimeRequestRepository.save(overtime);
        auditService.log("OVERTIME_REQUEST_CREATED", "OvertimeRequest", saved.getId(), employee.getEmployeeCode());
        return toResponse(saved);
    }

    /** Reserves approved overtime once for a draft payroll and returns it by employee. */
    @Transactional
    public java.util.Map<Long, List<OvertimeRequest>> allocateApprovedToPayroll(PayrollRun payrollRun) {
        Instant approvalCutoff = payrollRun.getPeriodEnd().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        List<OvertimeRequest> requests = overtimeRequestRepository.findApprovedReadyForPayroll(
                currentOrgService.orgCode(), OvertimeStatus.APPROVED, payrollRun.getPeriodEnd(), approvalCutoff
        );
        requests.forEach(request -> {
            if (request.getApprovedHourlyRate() == null && request.getApprovedPayRateType() == null) {
                capturePayRate(request, overtimePolicyService.requireActivePolicy(request.getEmployee()));
            }
            request.setPayrollRun(payrollRun);
        });
        overtimeRequestRepository.saveAll(requests);
        return requests.stream().collect(java.util.stream.Collectors.groupingBy(request -> request.getEmployee().getId()));
    }

    @Transactional
    public void releaseDraftPayrollReservations(Long payrollRunId) {
        overtimeRequestRepository.releaseFromDraftPayroll(currentOrgService.orgCode(), payrollRunId, OvertimeStatus.APPROVED);
    }

    /** Called when a payroll snapshot becomes immutable. */
    @Transactional
    public void markPayrollOvertimePaid(PayrollRun payrollRun) {
        List<OvertimeRequest> requests = overtimeRequestRepository.findByOrgCodeAndPayrollRunId(currentOrgService.orgCode(), payrollRun.getId());
        Instant paidAt = Instant.now();
        requests.stream().filter(request -> request.getStatus() == OvertimeStatus.APPROVED).forEach(request -> {
            request.setStatus(OvertimeStatus.PAID);
            request.setPaidAt(paidAt);
        });
        overtimeRequestRepository.saveAll(requests);
        if (!requests.isEmpty()) auditService.log("OVERTIME_PAID", "PayrollRun", payrollRun.getId(), "count=" + requests.size());
    }

    @Transactional
    public OvertimeResponse decide(Long id, OvertimeDecisionRequest request, UserPrincipal principal) {
        OvertimeRequest overtime = find(id);
        employeeAccessService.assertCanAccessEmployee(principal, overtime.getEmployee());
        payrollLockService.assertUnlocked(overtime.getOvertimeDate());
        if (overtime.getStatus() != OvertimeStatus.PENDING) {
            throw new BadRequestException("Only pending overtime requests can be decided");
        }
        if (request.status() != OvertimeStatus.APPROVED && request.status() != OvertimeStatus.REJECTED) {
            throw new BadRequestException("Overtime decision must be APPROVED or REJECTED");
        }
        if (request.status() == OvertimeStatus.APPROVED) {
            ApprovalPolicy.assertCanApproveRequest(principal, overtime.getRequestedBy());
            int eligibleMinutes = eligibleMinutes(overtime);
            if (eligibleMinutes == 0) {
                throw new BadRequestException("A completed attendance punch with eligible overtime is required before approval");
            }
            overtime.setApprovedMinutes(eligibleMinutes);
            capturePayRate(overtime, overtimePolicyService.requireActivePolicy(overtime.getEmployee()));
        }
        overtime.setStatus(request.status());
        overtime.setReviewerComment(blankToNull(request.reviewerComment()));
        overtime.setReviewedBy(currentUser(principal));
        overtime.setReviewedAt(Instant.now());
        OvertimeRequest saved = overtimeRequestRepository.save(overtime);
        auditService.log("OVERTIME_REQUEST_DECIDED", "OvertimeRequest", saved.getId(), saved.getStatus().name());
        return toResponse(saved);
    }

    @Transactional
    public OvertimeResponse cancel(Long id, UserPrincipal principal) {
        OvertimeRequest overtime = find(id);
        payrollLockService.assertUnlocked(overtime.getOvertimeDate());
        if (overtime.getStatus() != OvertimeStatus.PENDING) {
            throw new BadRequestException("Only pending overtime requests can be cancelled");
        }
        if (!overtime.getRequestedBy().getEmail().equalsIgnoreCase(principal.email()) && !isAdminOrHr(principal)) {
            throw new ResourceNotFoundException("Overtime request not found");
        }
        overtime.setStatus(OvertimeStatus.CANCELLED);
        overtime.setReviewerComment("Cancelled by requester");
        overtime.setReviewedBy(currentUser(principal));
        overtime.setReviewedAt(Instant.now());
        OvertimeRequest saved = overtimeRequestRepository.save(overtime);
        auditService.log("OVERTIME_REQUEST_CANCELLED", "OvertimeRequest", saved.getId(), saved.getEmployee().getEmployeeCode());
        return toResponse(saved);
    }

    private int eligibleMinutes(OvertimeRequest overtime) {
        return overtimeCalculator.eligibleMinutes(overtime.getRequestedMinutes(), punchOvertimeMinutes(overtime));
    }

    private void capturePayRate(OvertimeRequest overtime, com.payroll.backend.domain.OvertimePolicy policy) {
        overtime.setApprovedPayRateType(policy.getPayRateType());
        overtime.setApprovedPayRateValue(policy.getPayRateValue());
        overtime.setApprovedHourlyRate(policy.getPayRateType() == OvertimePayRateType.FIXED_HOURLY_AMOUNT
                ? policy.getPayRateValue() : null);
    }

    private int punchOvertimeMinutes(OvertimeRequest overtime) {
        Optional<AttendanceRecord> attendance = attendanceRecordRepository.findByOrgCodeAndEmployeeIdAndAttendanceDate(
                currentOrgService.orgCode(), overtime.getEmployee().getId(), overtime.getOvertimeDate()
        );
        Optional<ShiftAssignment> assignment = findShiftAssignment(overtime.getEmployee().getId(), overtime.getOvertimeDate());
        if (attendance.isEmpty() || assignment.isEmpty()) {
            return 0;
        }
        return overtimeCalculator.punchOvertimeMinutes(assignment.get().getShift(), overtime.getOvertimeDate(), attendance.get());
    }

    private Optional<ShiftAssignment> findShiftAssignment(Long employeeId, LocalDate date) {
        return shiftAssignmentRepository.findByOrgCodeAndEmployeeIdAndAssignmentDateBetweenOrderByAssignmentDate(
                currentOrgService.orgCode(), employeeId, date, date
        ).stream().findFirst();
    }

    private Employee requestedEmployee(Long requestedEmployeeId, UserPrincipal principal) {
        Employee employee = requestedEmployeeId == null
                ? employeeAccessService.findCurrentEmployee(principal)
                : employeeRepository.findByOrgCodeAndId(currentOrgService.orgCode(), requestedEmployeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
        employeeAccessService.assertCanAccessEmployee(principal, employee);
        return employee;
    }

    private OvertimeRequest find(Long id) {
        return overtimeRequestRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Overtime request not found"));
    }

    private AppUser currentUser(UserPrincipal principal) {
        return appUserRepository.findByOrgCodeAndEmailIgnoreCase(currentOrgService.orgCode(), principal.email())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private OvertimeResponse toResponse(OvertimeRequest overtime) {
        int punchMinutes = punchOvertimeMinutes(overtime);
        int eligibleMinutes = overtimeCalculator.eligibleMinutes(overtime.getRequestedMinutes(), punchMinutes);
        Employee employee = overtime.getEmployee();
        return new OvertimeResponse(
                overtime.getId(), employee.getId(), employee.getEmployeeCode(), fullName(employee), overtime.getOvertimeDate(),
                overtime.getRequestedMinutes(), punchMinutes, eligibleMinutes, overtime.getApprovedMinutes(), overtime.getReason(),
                overtime.getStatus(), overtime.getRequestedBy().getEmail(),
                overtime.getReviewedBy() == null ? null : overtime.getReviewedBy().getEmail(), overtime.getReviewerComment(),
                overtime.getReviewedAt(), overtime.getPayrollRun() == null ? null : overtime.getPayrollRun().getId(), overtime.getPaidAt(),
                overtime.getCreatedAt(), overtime.getUpdatedAt()
        );
    }

    private boolean isAdminOrHr(UserPrincipal principal) {
        return principal.getAuthorities().stream().anyMatch(authority ->
                "ROLE_ADMIN".equals(authority.getAuthority()) || "ROLE_HR".equals(authority.getAuthority()));
    }

    private String fullName(Employee employee) {
        return java.util.stream.Stream.of(employee.getFirstName(), employee.getMiddleName(), employee.getLastName())
                .filter(value -> value != null && !value.isBlank()).collect(Collectors.joining(" "));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
