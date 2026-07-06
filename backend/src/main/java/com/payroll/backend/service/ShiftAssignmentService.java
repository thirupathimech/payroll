package com.payroll.backend.service;

import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.Shift;
import com.payroll.backend.domain.ShiftAssignment;
import com.payroll.backend.dto.shift.ShiftAssignmentRequest;
import com.payroll.backend.dto.shift.ShiftAssignmentResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.ShiftAssignmentRepository;
import com.payroll.backend.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ShiftAssignmentService {

    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final EmployeeRepository employeeRepository;
    private final ShiftRepository shiftRepository;
    private final CurrentOrgService currentOrgService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<ShiftAssignmentResponse> search(Long employeeId, LocalDate startDate, LocalDate endDate) {
        String orgCode = currentOrgService.orgCode();
        LocalDate start = startDate == null ? LocalDate.now().withDayOfMonth(1) : startDate;
        LocalDate end = endDate == null ? start.plusMonths(1).minusDays(1) : endDate;
        if (end.isBefore(start)) {
            throw new BadRequestException("End date cannot be before start date");
        }
        List<ShiftAssignment> assignments = employeeId == null
                ? shiftAssignmentRepository.findByOrgCodeAndAssignmentDateBetweenOrderByAssignmentDate(orgCode, start, end)
                : shiftAssignmentRepository.findByOrgCodeAndEmployeeIdAndAssignmentDateBetweenOrderByAssignmentDate(orgCode, employeeId, start, end);
        return assignments.stream().map(this::toResponse).toList();
    }

    @Transactional
    public List<ShiftAssignmentResponse> create(ShiftAssignmentRequest request) {
        if (request.endDate().isBefore(request.startDate())) {
            throw new BadRequestException("End date cannot be before start date");
        }
        String orgCode = currentOrgService.orgCode();
        Employee employee = employeeRepository.findByOrgCodeAndId(orgCode, request.employeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
        Shift shift = shiftRepository.findByOrgCodeAndId(orgCode, request.shiftId())
                .filter(Shift::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Active shift not found"));

        List<LocalDate> dates = datesBetween(request.startDate(), request.endDate());
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

    @Transactional
    public void delete(Long id) {
        ShiftAssignment assignment = shiftAssignmentRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Shift assignment not found"));
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

    private ShiftAssignmentResponse toResponse(ShiftAssignment assignment) {
        Employee employee = assignment.getEmployee();
        Shift shift = assignment.getShift();
        return new ShiftAssignmentResponse(
                assignment.getId(),
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getFirstName() + " " + employee.getLastName(),
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
}
