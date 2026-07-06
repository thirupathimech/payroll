package com.payroll.backend.service;

import com.payroll.backend.domain.Department;
import com.payroll.backend.domain.Designation;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.employee.EmployeeRequest;
import com.payroll.backend.dto.employee.EmployeeResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.DepartmentRepository;
import com.payroll.backend.repository.DesignationRepository;
import com.payroll.backend.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;
    private final EmployeeDocumentService employeeDocumentService;
    private final AuditService auditService;
    private final CurrentOrgService currentOrgService;

    @Transactional(readOnly = true)
    public PageResponse<EmployeeResponse> search(
            String search,
            EmploymentStatus status,
            Long departmentId,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "firstName"));
        return PageResponse.from(employeeRepository
                .search(currentOrgService.orgCode(), blankToNull(search), status, departmentId, pageable)
                .map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public EmployeeResponse get(Long id) {
        return toResponse(findEmployee(id));
    }

    @Transactional
    public EmployeeResponse create(EmployeeRequest request) {
        ensureUniqueEmployee(request.employeeCode(), request.email(), null);
        Department department = findDepartment(request.departmentId());
        Designation designation = findDesignation(request.designationId());
        ensureDesignationBelongsToDepartment(designation, department);

        Employee employee = new Employee();
        employee.setOrgCode(currentOrgService.orgCode());
        apply(request, employee, department, designation);
        Employee saved = employeeRepository.save(employee);
        auditService.log("EMPLOYEE_CREATED", "Employee", saved.getId(), saved.getEmployeeCode());
        return toResponse(saved);
    }

    @Transactional
    public EmployeeResponse update(Long id, EmployeeRequest request) {
        Employee employee = findEmployee(id);
        if (!employee.getEmployeeCode().equalsIgnoreCase(request.employeeCode().trim())) {
            throw new BadRequestException("Employee code cannot be changed after creation");
        }
        ensureUniqueEmployee(request.employeeCode(), request.email(), id);
        Department department = findDepartment(request.departmentId());
        Designation designation = findDesignation(request.designationId());
        ensureDesignationBelongsToDepartment(designation, department);

        apply(request, employee, department, designation);
        Employee saved = employeeRepository.save(employee);
        auditService.log("EMPLOYEE_UPDATED", "Employee", saved.getId(), saved.getEmployeeCode());
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Employee employee = findEmployee(id);
        employee.setStatus(EmploymentStatus.TERMINATED);
        employeeRepository.save(employee);
        auditService.log("EMPLOYEE_TERMINATED", "Employee", employee.getId(), employee.getEmployeeCode());
    }

    private void apply(EmployeeRequest request, Employee employee, Department department, Designation designation) {
        employee.setEmployeeCode(request.employeeCode().trim().toUpperCase());
        employee.setFirstName(request.firstName().trim());
        employee.setLastName(request.lastName().trim());
        employee.setEmail(request.email().trim().toLowerCase());
        employee.setPhone(request.phone());
        employee.setDateOfBirth(request.dateOfBirth());
        employee.setJoiningDate(request.joiningDate());
        employee.setBaseSalary(request.baseSalary());
        employee.setBankAccountNumber(request.bankAccountNumber());
        employee.setTaxIdentificationNumber(request.taxIdentificationNumber());
        employee.setAddress(request.address());
        employee.setStatus(request.status());
        employee.setDepartment(department);
        employee.setDesignation(designation);
    }

    private void ensureUniqueEmployee(String employeeCode, String email, Long currentId) {
        String orgCode = currentOrgService.orgCode();
        employeeRepository.findByOrgCodeAndEmployeeCodeIgnoreCase(orgCode, employeeCode).ifPresent(existing -> {
            if (!existing.getId().equals(currentId)) {
                throw new BadRequestException("Employee code already exists");
            }
        });
        employeeRepository.findByOrgCodeAndEmailIgnoreCase(orgCode, email).ifPresent(existing -> {
            if (!existing.getId().equals(currentId)) {
                throw new BadRequestException("Employee email already exists");
            }
        });
    }

    private void ensureDesignationBelongsToDepartment(Designation designation, Department department) {
        if (!designation.getDepartment().getId().equals(department.getId())) {
            throw new BadRequestException("Designation does not belong to the selected department");
        }
    }

    private Department findDepartment(Long id) {
        return departmentRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
    }

    private Designation findDesignation(Long id) {
        return designationRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Designation not found"));
    }

    private Employee findEmployee(Long id) {
        return employeeRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
    }

    private EmployeeResponse toResponse(Employee employee) {
        String fullName = employee.getFirstName() + " " + employee.getLastName();
        return new EmployeeResponse(
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getFirstName(),
                employee.getLastName(),
                fullName,
                employee.getEmail(),
                employee.getPhone(),
                employee.getDateOfBirth(),
                employee.getJoiningDate(),
                employee.getBaseSalary(),
                employee.getBankAccountNumber(),
                employee.getTaxIdentificationNumber(),
                employee.getAddress(),
                employee.getStatus(),
                employee.getDepartment().getId(),
                employee.getDepartment().getName(),
                employee.getDesignation().getId(),
                employee.getDesignation().getTitle(),
                employeeDocumentService.hasProfilePhoto(employee.getId()),
                employee.getCreatedAt(),
                employee.getUpdatedAt()
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
