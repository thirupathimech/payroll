package com.payroll.backend.service;

import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.LeaveRequest;
import com.payroll.backend.domain.Shift;
import com.payroll.backend.domain.ShiftAssignment;
import com.payroll.backend.domain.enums.LeaveStatus;
import com.payroll.backend.dto.shift.ShiftAssignmentBulkUploadRequest;
import com.payroll.backend.dto.shift.ShiftAssignmentBulkUploadResponse;
import com.payroll.backend.dto.shift.ShiftAssignmentBulkUploadRowRequest;
import com.payroll.backend.dto.shift.ShiftAssignmentRequest;
import com.payroll.backend.dto.shift.ShiftAssignmentResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.LeaveRequestRepository;
import com.payroll.backend.repository.ShiftAssignmentRepository;
import com.payroll.backend.repository.ShiftRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShiftAssignmentService {

    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final EmployeeRepository employeeRepository;
    private final ShiftRepository shiftRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final CurrentOrgService currentOrgService;
    private final AuditService auditService;
    private final EmployeeAccessService employeeAccessService;
    private final PayrollLockService payrollLockService;

    @Transactional(readOnly = true)
    public List<ShiftAssignmentResponse> search(Long employeeId, LocalDate startDate, LocalDate endDate, UserPrincipal principal) {
        String orgCode = currentOrgService.orgCode();
        LocalDate start = startDate == null ? LocalDate.now().withDayOfMonth(1) : startDate;
        LocalDate end = endDate == null ? start.plusMonths(1).minusDays(1) : endDate;
        if (end.isBefore(start)) {
            throw new BadRequestException("End date cannot be before start date");
        }
        Long effectiveEmployeeId = isEmployee(principal) ? findCurrentEmployee(principal).getId() : employeeId;
        Long branchId = employeeAccessService.branchScopeId(principal);
        List<Long> managedEmployeeIds = scopedEmployeeIds(principal);
        if (employeeAccessService.isLead(principal) && managedEmployeeIds.isEmpty()) {
            return List.of();
        }
        if (!managedEmployeeIds.isEmpty() && effectiveEmployeeId != null && !managedEmployeeIds.contains(effectiveEmployeeId)) {
            return List.of();
        }
        List<ShiftAssignment> assignments = effectiveEmployeeId == null
                ? (!managedEmployeeIds.isEmpty()
                ? shiftAssignmentRepository.findByOrgCodeAndEmployeeIdInAndAssignmentDateBetweenOrderByAssignmentDate(orgCode, managedEmployeeIds, start, end)
                : (branchId == null
                ? shiftAssignmentRepository.findByOrgCodeAndAssignmentDateBetweenOrderByAssignmentDate(orgCode, start, end)
                : shiftAssignmentRepository.findByOrgCodeAndBranchIdAndAssignmentDateBetweenOrderByAssignmentDate(
                        orgCode,
                        branchId,
                        List.of(-1L),
                        false,
                        start,
                        end
                )))
                : shiftAssignmentRepository.findByOrgCodeAndEmployeeIdAndAssignmentDateBetweenOrderByAssignmentDate(orgCode, effectiveEmployeeId, start, end);
        if (branchId != null && effectiveEmployeeId != null) {
            assignments = assignments.stream()
                    .filter(assignment -> assignment.getEmployee().getBranch() != null && branchId.equals(assignment.getEmployee().getBranch().getId()))
                    .toList();
        }
        return assignments.stream().map(this::toResponse).toList();
    }

    @Transactional
    public List<ShiftAssignmentResponse> create(ShiftAssignmentRequest request, UserPrincipal principal) {
        if (request.endDate().isBefore(request.startDate())) {
            throw new BadRequestException("End date cannot be before start date");
        }
        payrollLockService.assertUnlocked(request.startDate(), request.endDate());
        String orgCode = currentOrgService.orgCode();
        Employee employee = employeeRepository.findByOrgCodeAndId(orgCode, request.employeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
        employeeAccessService.assertCanAccessEmployee(principal, employee);
        Shift shift = shiftRepository.findByOrgCodeAndId(orgCode, request.shiftId())
                .filter(Shift::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Active shift not found"));

        List<LocalDate> dates = datesBetween(request.startDate(), request.endDate());
        assertNoActiveLeaveRequests(orgCode, employee, dates);
        List<ShiftAssignment> existing = shiftAssignmentRepository.findByOrgCodeAndEmployeeIdAndAssignmentDateIn(
                orgCode,
                employee.getId(),
                dates
        );
        if (!existing.isEmpty() && !request.overrideExisting()) {
            throw new BadRequestException("Existing shift assignment found. Confirm override to replace it.");
        }
        if (!existing.isEmpty()) {
            shiftAssignmentRepository.deleteByOrgCodeAndEmployeeIdAndAssignmentDateIn(orgCode, employee.getId(), dates);
            shiftAssignmentRepository.flush();
        }

        List<ShiftAssignment> saved = dates.stream().map(date -> {
            ShiftAssignment assignment = new ShiftAssignment();
            assignment.setOrgCode(orgCode);
            assignment.setEmployee(employee);
            assignment.setShift(shift);
            assignment.setAssignmentDate(date);
            return shiftAssignmentRepository.save(assignment);
        }).toList();
        auditService.log("SHIFT_ASSIGNMENT_SAVED", "ShiftAssignment", employee.getId(), shift.getCode());
        return saved.stream().map(this::toResponse).toList();
    }

    /**
     * Saves a spreadsheet batch atomically. Validation and conflict detection happen before any
     * existing assignment is deleted, so an upload can never leave a partially changed schedule.
    */
    @Transactional
    public ShiftAssignmentBulkUploadResponse bulkCreate(ShiftAssignmentBulkUploadRequest request, UserPrincipal principal) {
        String orgCode = currentOrgService.orgCode();
        Map<Long, PreparedUploadRow> rowsByEmployeeId = new LinkedHashMap<>();
        for (ShiftAssignmentBulkUploadRowRequest row : request.assignments()) {
            if (row.endDate().isBefore(row.startDate())) {
                throw new BadRequestException("To Date cannot be before From Date for Employee Code " + row.employeeCode().trim());
            }
            if (row.endDate().isAfter(row.startDate().plusDays(365))) {
                throw new BadRequestException("A shift upload row can cover a maximum of 366 days");
            }
            payrollLockService.assertUnlocked(row.startDate(), row.endDate());
            String employeeCode = row.employeeCode().trim();
            String shiftCode = row.shiftCode().trim();
            Employee employee = employeeRepository.findByOrgCodeAndEmployeeCodeIgnoreCase(orgCode, employeeCode)
                    .orElseThrow(() -> new BadRequestException("Employee Code " + employeeCode + " was not found"));
            employeeAccessService.assertCanAccessEmployee(principal, employee);
            Shift shift = shiftRepository.findByOrgCodeAndCodeIgnoreCase(orgCode, shiftCode)
                    .filter(Shift::isActive)
                    .orElseThrow(() -> new BadRequestException("Active Shift Code " + shiftCode + " was not found"));

            List<LocalDate> dates = datesBetween(row.startDate(), row.endDate());
            if (rowsByEmployeeId.putIfAbsent(employee.getId(), new PreparedUploadRow(employee, shift, dates)) != null) {
                throw new BadRequestException("Employee Code " + employee.getEmployeeCode() + " appears more than once in the upload");
            }
        }

        List<ShiftAssignment> existing = rowsByEmployeeId.values().stream()
                .flatMap(row -> shiftAssignmentRepository.findByOrgCodeAndEmployeeIdAndAssignmentDateIn(
                        orgCode,
                        row.employee().getId(),
                        row.dates()
                ).stream())
                .toList();
        Map<String, String> leaveConflictErrors = new LinkedHashMap<>();
        for (PreparedUploadRow row : rowsByEmployeeId.values()) {
            if (!activeLeaveRequests(orgCode, row.employee(), row.dates()).isEmpty()) {
                leaveConflictErrors.put(
                        "employeeCode:" + row.employee().getEmployeeCode().toUpperCase(),
                        "A pending or approved leave request exists for one or more selected dates. Shift assignments cannot be changed."
                );
            }
        }
        if (!leaveConflictErrors.isEmpty()) {
            String employeesWithLeave = leaveConflictErrors.keySet().stream()
                    .map(key -> key.substring("employeeCode:".length()))
                    .limit(5)
                    .collect(Collectors.joining(", "));
            String suffix = leaveConflictErrors.size() > 5 ? ", and others" : "";
            throw new BadRequestException(
                    "Shift upload cannot be saved because pending or approved leave requests exist for "
                            + employeesWithLeave + suffix + ". Cancel or reject the leave request before changing the shift.",
                    leaveConflictErrors
            );
        }
        if (!existing.isEmpty() && !request.overrideExisting()) {
            String employeesWithConflicts = existing.stream()
                    .map(assignment -> assignment.getEmployee().getEmployeeCode())
                    .distinct()
                    .limit(5)
                    .collect(Collectors.joining(", "));
            String suffix = existing.stream().map(assignment -> assignment.getEmployee().getId()).distinct().count() > 5 ? ", and others" : "";
            Map<String, String> conflictErrors = new LinkedHashMap<>();
            existing.stream()
                    .map(assignment -> assignment.getEmployee().getEmployeeCode())
                    .distinct()
                    .forEach(employeeCode -> conflictErrors.put(
                            "employeeCode:" + employeeCode.toUpperCase(),
                            "Existing shift assignment found for one or more selected dates. Enable overwrite to replace it."
                    ));
            throw new BadRequestException(
                    "Existing shift assignments found for " + employeesWithConflicts + suffix
                            + ". Enable overwrite to replace them; no assignments were saved.",
                    conflictErrors
            );
        }

        if (!existing.isEmpty()) {
            shiftAssignmentRepository.deleteAll(existing);
            shiftAssignmentRepository.flush();
        }

        List<ShiftAssignment> saved = new ArrayList<>();
        for (PreparedUploadRow row : rowsByEmployeeId.values()) {
            for (LocalDate date : row.dates()) {
                ShiftAssignment assignment = new ShiftAssignment();
                assignment.setOrgCode(orgCode);
                assignment.setEmployee(row.employee());
                assignment.setShift(row.shift());
                assignment.setAssignmentDate(date);
                saved.add(shiftAssignmentRepository.save(assignment));
            }
        }
        auditService.log("SHIFT_ASSIGNMENT_BULK_UPLOADED", "ShiftAssignment", null, "rows=" + rowsByEmployeeId.size());
        return new ShiftAssignmentBulkUploadResponse(
                rowsByEmployeeId.size(),
                saved.size(),
                existing.size(),
                saved.stream().map(this::toResponse).toList()
        );
    }

    @Transactional
    public void delete(Long id, UserPrincipal principal) {
        ShiftAssignment assignment = shiftAssignmentRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Shift assignment not found"));
        employeeAccessService.assertCanAccessEmployee(principal, assignment.getEmployee());
        payrollLockService.assertUnlocked(assignment.getAssignmentDate());
        assertNoActiveLeaveRequests(currentOrgService.orgCode(), assignment.getEmployee(), List.of(assignment.getAssignmentDate()));
        shiftAssignmentRepository.delete(assignment);
        auditService.log("SHIFT_ASSIGNMENT_DELETED", "ShiftAssignment", assignment.getId(), assignment.getEmployee().getEmployeeCode());
    }

    private List<LocalDate> datesBetween(LocalDate startDate, LocalDate endDate) {
        List<LocalDate> dates = new ArrayList<>();
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            dates.add(current);
            current = current.plusDays(1);
        }
        return dates;
    }

    private void assertNoActiveLeaveRequests(String orgCode, Employee employee, List<LocalDate> dates) {
        if (!activeLeaveRequests(orgCode, employee, dates).isEmpty()) {
            throw new BadRequestException(
                    "Shift assignments cannot be changed because a pending or approved leave request exists for "
                            + employee.getEmployeeCode() + " on the selected date(s). Cancel or reject the leave request first."
            );
        }
    }

    private List<LeaveRequest> activeLeaveRequests(String orgCode, Employee employee, List<LocalDate> dates) {
        return leaveRequestRepository.findByOrgCodeAndEmployeeIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                        orgCode,
                        employee.getId(),
                        dates.get(dates.size() - 1),
                        dates.get(0)
                ).stream()
                .filter(leave -> leave.getStatus() == LeaveStatus.PENDING || leave.getStatus() == LeaveStatus.APPROVED)
                .toList();
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

    private ShiftAssignmentResponse toResponse(ShiftAssignment assignment) {
        Employee employee = assignment.getEmployee();
        Shift shift = assignment.getShift();
        return new ShiftAssignmentResponse(
                assignment.getId(),
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getFirstName() + " " + employee.getLastName(),
                employee.getEmploymentType(),
                employee.getDepartment().getId(),
                employee.getDepartment().getName(),
                shift.getId(),
                shift.getName(),
                shift.getCode(),
                shift.getStartTime(),
                shift.getDurationHours(),
                shift.getDurationMinutes(),
                assignment.getAssignmentDate(),
                assignment.getCreatedAt(),
                assignment.getUpdatedAt()
        );
    }

    private record PreparedUploadRow(Employee employee, Shift shift, List<LocalDate> dates) {
    }
}
