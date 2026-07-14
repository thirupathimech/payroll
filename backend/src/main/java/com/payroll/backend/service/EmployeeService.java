package com.payroll.backend.service;

import com.payroll.backend.domain.Branch;
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
import com.payroll.backend.repository.BranchRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.security.UserPrincipal;
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
    private final BranchService branchService;
    private final BranchRepository branchRepository;
    private final EmployeeSettingsService employeeSettingsService;

    @Transactional(readOnly = true)
    public PageResponse<EmployeeResponse> search(
            String search,
            EmploymentStatus status,
            Long departmentId,
            int page,
            int size,
            UserPrincipal principal
    ) {
        if (isEmployee(principal)) {
            return PageResponse.from(new org.springframework.data.domain.PageImpl<>(
                    java.util.List.of(findCurrentEmployee(principal)),
                    PageRequest.of(0, 1),
                    1
            ).map(this::toResponse));
        }
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "firstName"));
        return PageResponse.from(employeeRepository
                .search(currentOrgService.orgCode(), blankToNull(search), status, departmentId, pageable)
                .map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public EmployeeResponse get(Long id, UserPrincipal principal) {
        Employee employee = findEmployee(id);
        if (isEmployee(principal) && !employee.getId().equals(findCurrentEmployee(principal).getId())) {
            throw new ResourceNotFoundException("Employee not found");
        }
        return toResponse(employee);
    }

    @Transactional(readOnly = true)
    public EmployeeResponse getCurrent(UserPrincipal principal) {
        return toResponse(findCurrentEmployee(principal));
    }

    @Transactional
    public EmployeeResponse create(EmployeeRequest request) {
        String employeeCode = resolveEmployeeCodeForCreate(request);
        ensureUniqueEmployee(employeeCode, request.email(), null);
        Department department = findDepartment(request.departmentId());
        Designation designation = findDesignation(request.designationId());
        Branch branch = findBranch(request.branchId());
        ensureDesignationBelongsToDepartment(designation, department);

        Employee employee = new Employee();
        employee.setOrgCode(currentOrgService.orgCode());
        apply(request, employee, department, designation, branch, employeeCode);
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
        Branch branch = findBranch(request.branchId());
        ensureDesignationBelongsToDepartment(designation, department);

        apply(request, employee, department, designation, branch, employee.getEmployeeCode());
        Employee saved = employeeRepository.save(employee);
        auditService.log("EMPLOYEE_UPDATED", "Employee", saved.getId(), saved.getEmployeeCode());
        return toResponse(saved);
    }

    @Transactional
    public EmployeeResponse updateCurrent(UserPrincipal principal, EmployeeRequest request) {
        Employee employee = findCurrentEmployee(principal);
        if (!employee.getEmployeeCode().equalsIgnoreCase(request.employeeCode().trim())) {
            throw new BadRequestException("Employee code cannot be changed after creation");
        }
        ensureUniqueEmployee(request.employeeCode(), request.email(), employee.getId());
        employee.setFirstName(request.firstName().trim());
        employee.setLastName(request.lastName().trim());
        employee.setEmail(request.email().trim().toLowerCase());
        employee.setPhone(request.phone());
        employee.setDateOfBirth(request.dateOfBirth());
        employee.setBankAccountNumber(request.bankAccountNumber());
        employee.setTaxIdentificationNumber(request.taxIdentificationNumber());
        employee.setAddress(request.address());
        Employee saved = employeeRepository.save(employee);
        auditService.log("EMPLOYEE_SELF_UPDATED", "Employee", saved.getId(), saved.getEmployeeCode());
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Employee employee = findEmployee(id);
        employee.setStatus(EmploymentStatus.TERMINATED);
        employeeRepository.save(employee);
        auditService.log("EMPLOYEE_TERMINATED", "Employee", employee.getId(), employee.getEmployeeCode());
    }

    private void apply(EmployeeRequest request, Employee employee, Department department, Designation designation, Branch branch, String employeeCode) {
        employee.setEmployeeCode(employeeCode);
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
        employee.setBranch(branch);
        employee.setStatus(request.status());
        employee.setDepartment(department);
        employee.setDesignation(designation);
    }

    private String resolveEmployeeCodeForCreate(EmployeeRequest request) {
        String requestedCode = request.employeeCode() == null ? "" : request.employeeCode().trim().toUpperCase();
        String generatedCode = employeeSettingsService.generateNextEmployeeCode();
        if (generatedCode != null) {
            return generatedCode;
        }
        if (requestedCode.isBlank()) {
            throw new BadRequestException("Employee code is required");
        }
        return requestedCode;
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

    private Branch findBranch(Long id) {
        if (id == null) {
            return branchService.ensureDefaultBranch(currentOrgService.orgCode());
        }
        return branchRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found"));
    }

    private Employee findEmployee(Long id) {
        return employeeRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
    }

    private Employee findCurrentEmployee(UserPrincipal principal) {
        if (principal == null || principal.employeeCode() == null || principal.employeeCode().isBlank()) {
            throw new ResourceNotFoundException("Employee profile not found");
        }
        return employeeRepository.findByOrgCodeAndEmployeeCodeIgnoreCase(currentOrgService.orgCode(), principal.employeeCode())
                .orElseThrow(() -> new ResourceNotFoundException("Employee profile not found"));
    }

    private boolean isEmployee(UserPrincipal principal) {
        return principal != null && principal.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_EMPLOYEE".equals(authority.getAuthority()));
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
                employee.getBranch() == null ? null : employee.getBranch().getId(),
                employee.getBranch() == null ? null : employee.getBranch().getName(),
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
