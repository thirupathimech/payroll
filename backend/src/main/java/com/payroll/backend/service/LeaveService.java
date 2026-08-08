package com.payroll.backend.service;

import com.payroll.backend.domain.AppUser;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.LeaveRequest;
import com.payroll.backend.domain.ShiftAssignment;
import com.payroll.backend.domain.enums.LeaveStatus;
import com.payroll.backend.domain.enums.WeekOffAssignmentType;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.leave.LeaveCreateRequest;
import com.payroll.backend.dto.leave.LeaveDecisionRequest;
import com.payroll.backend.dto.leave.LeaveResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.AppUserRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.LeaveRequestRepository;
import com.payroll.backend.repository.HolidayRepository;
import com.payroll.backend.repository.ShiftAssignmentRepository;
import com.payroll.backend.repository.WeekOffAssignmentRepository;
import com.payroll.backend.repository.WeekOffExclusionRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.time.Duration;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final AppUserRepository appUserRepository;
    private final AuditService auditService;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService employeeAccessService;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final HolidayRepository holidayRepository;
    private final WeekOffAssignmentRepository weekOffAssignmentRepository;
    private final WeekOffExclusionRepository weekOffExclusionRepository;

    @Transactional(readOnly = true)
    public PageResponse<LeaveResponse> search(
            String search,
            Long employeeId,
            LeaveStatus status,
            int page,
            int size,
            UserPrincipal principal
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Long effectiveEmployeeId = isEmployee(principal) ? findCurrentEmployee(principal).getId() : employeeId;
        Long branchId = employeeAccessService.branchScopeId(principal);
        List<Long> managedEmployeeIds = scopedEmployeeIds(principal);
        if (employeeAccessService.isLead(principal) && managedEmployeeIds.isEmpty()) {
            return PageResponse.from(new org.springframework.data.domain.PageImpl<LeaveRequest>(
                    List.of(),
                    pageable,
                    0
            ).map(this::toResponse));
        }
        return PageResponse.from(leaveRequestRepository
                .search(
                        currentOrgService.orgCode(),
                        blankToNull(search),
                        effectiveEmployeeId,
                        branchId,
                        managedEmployeeIds.isEmpty() ? List.of(-1L) : managedEmployeeIds,
                        !managedEmployeeIds.isEmpty(),
                        status,
                        pageable
                )
                .map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public List<LeaveResponse> recent(UserPrincipal principal) {
        Long branchId = employeeAccessService.branchScopeId(principal);
        List<Long> managedEmployeeIds = scopedEmployeeIds(principal);
        if (employeeAccessService.isLead(principal) && managedEmployeeIds.isEmpty()) {
            return List.of();
        }
        return leaveRequestRepository.findRecentByOrgCodeAndBranchId(
                        currentOrgService.orgCode(),
                        branchId,
                        managedEmployeeIds.isEmpty() ? List.of(-1L) : managedEmployeeIds,
                        !managedEmployeeIds.isEmpty(),
                        PageRequest.of(0, 5)
                ).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public LeaveResponse get(Long id, UserPrincipal principal) {
        LeaveRequest leave = findLeave(id);
        employeeAccessService.assertCanAccessEmployee(principal, leave.getEmployee());
        return toResponse(leave);
    }

    @Transactional
    public LeaveResponse create(LeaveCreateRequest request, UserPrincipal principal) {
        validateDates(request.startDate(), request.endDate(), request.startTime(), request.endTime());
        String orgCode = currentOrgService.orgCode();
        Employee employee = isEmployee(principal)
                ? findCurrentEmployee(principal)
                : employeeRepository.findByOrgCodeAndId(orgCode, request.employeeId())
                        .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
        employeeAccessService.assertCanAccessEmployee(principal, employee);

        LeaveCalculation calculation = calculateLeave(employee, request);

        LeaveRequest leaveRequest = new LeaveRequest();
        leaveRequest.setOrgCode(orgCode);
        leaveRequest.setEmployee(employee);
        leaveRequest.setLeaveType(request.leaveType());
        leaveRequest.setStartDate(request.startDate());
        leaveRequest.setEndDate(request.endDate());
        leaveRequest.setStartTime(request.startTime());
        leaveRequest.setEndTime(request.endTime());
        leaveRequest.setLeaveMinutes(calculation.minutes());
        leaveRequest.setReason(request.reason().trim());
        leaveRequest.setStatus(LeaveStatus.PENDING);

        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);
        auditService.log("LEAVE_REQUEST_CREATED", "LeaveRequest", saved.getId(), employee.getEmployeeCode());
        return toResponse(saved);
    }

    @Transactional
    public LeaveResponse decide(Long id, LeaveDecisionRequest request, UserPrincipal principal) {
        LeaveRequest leaveRequest = findLeave(id);
        employeeAccessService.assertCanAccessEmployee(principal, leaveRequest.getEmployee());
        if (request.status() == LeaveStatus.PENDING) {
            throw new BadRequestException("Decision status must be APPROVED, REJECTED, or CANCELLED");
        }

        AppUser reviewer = currentUser();
        leaveRequest.setStatus(request.status());
        leaveRequest.setReviewerComment(request.reviewerComment());
        leaveRequest.setReviewedBy(reviewer);
        leaveRequest.setReviewedAt(Instant.now());

        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);
        auditService.log("LEAVE_REQUEST_DECIDED", "LeaveRequest", saved.getId(), request.status().name());
        return toResponse(saved);
    }

    private void validateDates(LocalDate startDate, LocalDate endDate, LocalTime startTime, LocalTime endTime) {
        if (endDate.isBefore(startDate)) {
            throw new BadRequestException("Leave end date cannot be before start date");
        }
        if (startDate.equals(endDate) && !endTime.isAfter(startTime)) {
            throw new BadRequestException("Leave end time must be after start time");
        }
    }

    private LeaveCalculation calculateLeave(Employee employee, LeaveCreateRequest request) {
        List<ShiftAssignment> assignments = shiftAssignmentRepository
                .findByOrgCodeAndEmployeeIdAndAssignmentDateBetweenOrderByAssignmentDate(
                        currentOrgService.orgCode(), employee.getId(), request.startDate(), request.endDate());
        List<LocalDate> workingDates = new java.util.ArrayList<>();
        for (LocalDate date = request.startDate(); !date.isAfter(request.endDate()); date = date.plusDays(1)) {
            if (!isHoliday(employee, date) && !isWeekOff(employee, date)) {
                workingDates.add(date);
            }
        }
        if (workingDates.isEmpty()) {
            throw new BadRequestException("Leave cannot be applied on holidays or week-off days");
        }
        int minutes = 0;
        for (LocalDate date = request.startDate(); !date.isAfter(request.endDate()); date = date.plusDays(1)) {
            if (isHoliday(employee, date) || isWeekOff(employee, date)) {
                continue;
            }
            LocalDate currentDate = date;
            ShiftAssignment assignment = assignments.stream()
                    .filter(item -> item.getAssignmentDate().equals(currentDate))
                    .findFirst()
                    .orElseThrow(() -> new BadRequestException("No shift assigned for " + currentDate + ". Leave cannot be applied."));
            LocalTime shiftStart = assignment.getShift().getStartTime();
            LocalTime shiftEnd = shiftStart.plusHours(assignment.getShift().getDurationHours())
                    .plusMinutes(assignment.getShift().getDurationMinutes());
            LocalTime from = date.equals(workingDates.get(0)) ? request.startTime() : shiftStart;
            LocalTime to = date.equals(workingDates.get(workingDates.size() - 1)) ? request.endTime() : shiftEnd;
            if (from.isBefore(shiftStart) || to.isAfter(shiftEnd) || !to.isAfter(from)) {
                throw new BadRequestException("Leave time on " + date + " must be within shift hours (" + shiftStart + " to " + shiftEnd + ")");
            }
            minutes += (int) Duration.between(from, to).toMinutes();
        }
        return new LeaveCalculation(minutes);
    }

    private boolean isHoliday(Employee employee, LocalDate date) {
        if (employee.getBranch() == null || employee.getDepartment() == null || employee.getDesignation() == null) {
            return false;
        }
        return holidayRepository.findByOrgCodeAndBranchIdAndDepartmentIdAndDesignationIdAndHolidayDate(
                currentOrgService.orgCode(), employee.getBranch().getId(), employee.getDepartment().getId(),
                employee.getDesignation().getId(), date).isPresent();
    }

    private boolean isWeekOff(Employee employee, LocalDate date) {
        String org = currentOrgService.orgCode();
        if (employee.getBranch() != null && employee.getDepartment() != null && employee.getDesignation() != null) {
            if (weekOffExclusionRepository.existsByOrgCodeAndBranchIdAndDepartmentIdAndDesignationIdAndExcludedDate(
                    org, employee.getBranch().getId(), employee.getDepartment().getId(), employee.getDesignation().getId(), date)) {
                return false;
            }
        }
        if (weekOffAssignmentRepository.findByOrgCodeAndAssignmentTypeAndEmployeeIdAndWeekOffDate(
                org, WeekOffAssignmentType.EMPLOYEE_DATE, employee.getId(), date).isPresent()) return true;
        if (weekOffAssignmentRepository.existsByOrgCodeAndAssignmentTypeAndEmployeeIdAndDayOfWeek(
                org, WeekOffAssignmentType.EMPLOYEE_WEEKLY, employee.getId(), date.getDayOfWeek())) return true;
        return employee.getBranch() != null && employee.getDepartment() != null && employee.getDesignation() != null
                && weekOffAssignmentRepository.findByOrgCodeAndAssignmentTypeAndBranchIdAndDepartmentIdAndDesignationIdAndDayOfWeek(
                org, WeekOffAssignmentType.GROUP_WEEKLY,
                employee.getBranch().getId(), employee.getDepartment().getId(), employee.getDesignation().getId(),
                date.getDayOfWeek()).isPresent();
    }

    private AppUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new BadRequestException("Reviewer is not authenticated");
        }
        return appUserRepository.findByOrgCodeAndEmailIgnoreCase(principal.orgCode(), authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer not found"));
    }

    private LeaveRequest findLeave(Long id) {
        return leaveRequestRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found"));
    }

    private Employee findCurrentEmployee(UserPrincipal principal) {
        return employeeAccessService.findCurrentEmployee(principal);
    }

    private boolean isEmployee(UserPrincipal principal) {
        return employeeAccessService.isEmployee(principal);
    }

    private List<Long> scopedEmployeeIds(UserPrincipal principal) {
        return employeeAccessService.managedEmployeeIds(principal);
    }

    public LeaveResponse toResponse(LeaveRequest leaveRequest) {
        Employee employee = leaveRequest.getEmployee();
        String employeeName = employee.getFirstName() + " " + employee.getLastName();
        long days = ChronoUnit.DAYS.between(leaveRequest.getStartDate(), leaveRequest.getEndDate()) + 1;
        return new LeaveResponse(
                leaveRequest.getId(),
                employee.getId(),
                employee.getEmployeeCode(),
                employeeName,
                leaveRequest.getLeaveType(),
                leaveRequest.getStatus(),
                leaveRequest.getStartDate(),
                leaveRequest.getEndDate(),
                leaveRequest.getStartTime(),
                leaveRequest.getEndTime(),
                days,
                leaveRequest.getLeaveMinutes(),
                leaveRequest.getReason(),
                leaveRequest.getReviewedBy() == null ? null : leaveRequest.getReviewedBy().getEmail(),
                leaveRequest.getReviewerComment(),
                leaveRequest.getReviewedAt(),
                leaveRequest.getCreatedAt(),
                leaveRequest.getUpdatedAt()
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record LeaveCalculation(int minutes) { }
}
