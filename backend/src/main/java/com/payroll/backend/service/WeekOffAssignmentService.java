package com.payroll.backend.service;

import com.payroll.backend.domain.Branch;
import com.payroll.backend.domain.Department;
import com.payroll.backend.domain.Designation;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.WeekOffAssignment;
import com.payroll.backend.domain.enums.WeekOffAssignmentType;
import com.payroll.backend.dto.weekoff.WeekOffAssignmentRequest;
import com.payroll.backend.dto.weekoff.WeekOffAssignmentResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.BranchRepository;
import com.payroll.backend.repository.DepartmentRepository;
import com.payroll.backend.repository.DesignationRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.WeekOffAssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class WeekOffAssignmentService {

    private final WeekOffAssignmentRepository weekOffAssignmentRepository;
    private final BranchRepository branchRepository;
    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;
    private final EmployeeRepository employeeRepository;
    private final CurrentOrgService currentOrgService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<WeekOffAssignmentResponse> search(WeekOffAssignmentType type, Long employeeId) {
        return weekOffAssignmentRepository.search(currentOrgService.orgCode(), type, employeeId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<WeekOffAssignmentResponse> create(WeekOffAssignmentRequest request) {
        return switch (request.type()) {
            case GROUP_WEEKLY -> createGroupWeekly(request);
            case EMPLOYEE_DATE -> createEmployeeDate(request);
            case EMPLOYEE_WEEKLY -> createEmployeeWeekly(request);
        };
    }

    @Transactional
    public void delete(Long id) {
        WeekOffAssignment assignment = weekOffAssignmentRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Week off assignment not found"));
        weekOffAssignmentRepository.delete(assignment);
        auditService.log("WEEK_OFF_ASSIGNMENT_DELETED", "WeekOffAssignment", assignment.getId(), assignment.getAssignmentType().name());
    }

    private List<WeekOffAssignmentResponse> createGroupWeekly(WeekOffAssignmentRequest request) {
        Set<DayOfWeek> days = requireDays(request.dayOfWeeks());
        Branch branch = findBranch(request.branchId());
        Department department = findDepartment(request.departmentId());
        Designation designation = findDesignation(request.designationId());
        ensureDesignationBelongsToDepartment(designation, department);

        List<WeekOffAssignment> assignments = days.stream()
                .sorted(Comparator.comparingInt(DayOfWeek::getValue))
                .map(day -> weekOffAssignmentRepository
                        .findByOrgCodeAndAssignmentTypeAndBranchIdAndDepartmentIdAndDesignationIdAndDayOfWeek(
                                currentOrgService.orgCode(),
                                WeekOffAssignmentType.GROUP_WEEKLY,
                                branch.getId(),
                                department.getId(),
                                designation.getId(),
                                day
                        )
                        .orElseGet(() -> saveGroupWeekly(branch, department, designation, day)))
                .toList();
        auditService.log("WEEK_OFF_GROUP_WEEKLY_SAVED", "WeekOffAssignment", department.getId(), designation.getTitle());
        return assignments.stream().map(this::toResponse).toList();
    }

    private WeekOffAssignment saveGroupWeekly(Branch branch, Department department, Designation designation, DayOfWeek day) {
        WeekOffAssignment assignment = baseAssignment(WeekOffAssignmentType.GROUP_WEEKLY);
        assignment.setBranch(branch);
        assignment.setDepartment(department);
        assignment.setDesignation(designation);
        assignment.setDayOfWeek(day);
        return weekOffAssignmentRepository.save(assignment);
    }

    private List<WeekOffAssignmentResponse> createEmployeeDate(WeekOffAssignmentRequest request) {
        Employee employee = findEmployee(request.employeeId());
        Set<LocalDate> dates = requireDates(request.dates());
        List<WeekOffAssignment> assignments = dates.stream()
                .sorted()
                .map(date -> weekOffAssignmentRepository
                        .findByOrgCodeAndAssignmentTypeAndEmployeeIdAndWeekOffDate(
                                currentOrgService.orgCode(),
                                WeekOffAssignmentType.EMPLOYEE_DATE,
                                employee.getId(),
                                date
                        )
                        .orElseGet(() -> saveEmployeeDate(employee, date)))
                .toList();
        auditService.log("WEEK_OFF_EMPLOYEE_DATE_SAVED", "WeekOffAssignment", employee.getId(), employee.getEmployeeCode());
        return assignments.stream().map(this::toResponse).toList();
    }

    private WeekOffAssignment saveEmployeeDate(Employee employee, LocalDate date) {
        WeekOffAssignment assignment = baseAssignment(WeekOffAssignmentType.EMPLOYEE_DATE);
        assignment.setEmployee(employee);
        assignment.setWeekOffDate(date);
        return weekOffAssignmentRepository.save(assignment);
    }

    private List<WeekOffAssignmentResponse> createEmployeeWeekly(WeekOffAssignmentRequest request) {
        Employee employee = findEmployee(request.employeeId());
        Set<DayOfWeek> days = requireDays(request.dayOfWeeks());
        List<WeekOffAssignment> assignments = days.stream()
                .sorted(Comparator.comparingInt(DayOfWeek::getValue))
                .map(day -> weekOffAssignmentRepository
                        .findByOrgCodeAndAssignmentTypeAndEmployeeIdAndDayOfWeek(
                                currentOrgService.orgCode(),
                                WeekOffAssignmentType.EMPLOYEE_WEEKLY,
                                employee.getId(),
                                day
                        )
                        .orElseGet(() -> saveEmployeeWeekly(employee, day)))
                .toList();
        auditService.log("WEEK_OFF_EMPLOYEE_WEEKLY_SAVED", "WeekOffAssignment", employee.getId(), employee.getEmployeeCode());
        return assignments.stream().map(this::toResponse).toList();
    }

    private WeekOffAssignment saveEmployeeWeekly(Employee employee, DayOfWeek day) {
        WeekOffAssignment assignment = baseAssignment(WeekOffAssignmentType.EMPLOYEE_WEEKLY);
        assignment.setEmployee(employee);
        assignment.setDayOfWeek(day);
        return weekOffAssignmentRepository.save(assignment);
    }

    private WeekOffAssignment baseAssignment(WeekOffAssignmentType type) {
        WeekOffAssignment assignment = new WeekOffAssignment();
        assignment.setOrgCode(currentOrgService.orgCode());
        assignment.setAssignmentType(type);
        return assignment;
    }

    private Set<DayOfWeek> requireDays(Set<DayOfWeek> days) {
        if (days == null || days.isEmpty()) {
            throw new BadRequestException("Select at least one week off day");
        }
        return days;
    }

    private Set<LocalDate> requireDates(Set<LocalDate> dates) {
        if (dates == null || dates.isEmpty()) {
            throw new BadRequestException("Select at least one week off date");
        }
        return dates;
    }

    private Branch findBranch(Long id) {
        if (id == null) {
            throw new BadRequestException("Branch is required");
        }
        return branchRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found"));
    }

    private Department findDepartment(Long id) {
        if (id == null) {
            throw new BadRequestException("Department is required");
        }
        return departmentRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
    }

    private Designation findDesignation(Long id) {
        if (id == null) {
            throw new BadRequestException("Designation is required");
        }
        return designationRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Designation not found"));
    }

    private Employee findEmployee(Long id) {
        if (id == null) {
            throw new BadRequestException("Employee is required");
        }
        return employeeRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
    }

    private void ensureDesignationBelongsToDepartment(Designation designation, Department department) {
        if (!designation.getDepartment().getId().equals(department.getId())) {
            throw new BadRequestException("Designation does not belong to the selected department");
        }
    }

    private WeekOffAssignmentResponse toResponse(WeekOffAssignment assignment) {
        Branch branch = assignment.getBranch();
        Department department = assignment.getDepartment();
        Designation designation = assignment.getDesignation();
        Employee employee = assignment.getEmployee();
        return new WeekOffAssignmentResponse(
                assignment.getId(),
                assignment.getAssignmentType(),
                branch == null ? null : branch.getId(),
                branch == null ? null : branch.getName(),
                department == null ? null : department.getId(),
                department == null ? null : department.getName(),
                designation == null ? null : designation.getId(),
                designation == null ? null : designation.getTitle(),
                employee == null ? null : employee.getId(),
                employee == null ? null : employee.getEmployeeCode(),
                employee == null ? null : employee.getFirstName() + " " + employee.getLastName(),
                assignment.getDayOfWeek(),
                assignment.getWeekOffDate(),
                assignment.getCreatedAt(),
                assignment.getUpdatedAt()
        );
    }
}
