package com.payroll.backend.service;

import com.payroll.backend.domain.Branch;
import com.payroll.backend.domain.Department;
import com.payroll.backend.domain.Designation;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.EmployeeEducation;
import com.payroll.backend.domain.EmployeeExperience;
import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.employee.EmployeeEducationRequest;
import com.payroll.backend.dto.employee.EmployeeEducationResponse;
import com.payroll.backend.dto.employee.EmployeeHierarchyNodeResponse;
import com.payroll.backend.dto.employee.EmployeeHierarchyResponse;
import com.payroll.backend.dto.employee.EmployeeExperienceRequest;
import com.payroll.backend.dto.employee.EmployeeExperienceResponse;
import com.payroll.backend.dto.employee.EmployeeRequest;
import com.payroll.backend.dto.employee.EmployeeResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.DepartmentRepository;
import com.payroll.backend.repository.EmployeeEducationRepository;
import com.payroll.backend.repository.EmployeeExperienceRepository;
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

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;
    private final EmployeeEducationRepository employeeEducationRepository;
    private final EmployeeExperienceRepository employeeExperienceRepository;
    private final EmployeeDocumentService employeeDocumentService;
    private final AuditService auditService;
    private final CurrentOrgService currentOrgService;
    private final BranchService branchService;
    private final BranchRepository branchRepository;
    private final EmployeeSettingsService employeeSettingsService;
    private final EmployeeAccessService employeeAccessService;

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
        List<Long> managedEmployeeIds = scopedEmployeeIds(principal);
        if (employeeAccessService.isLead(principal) && managedEmployeeIds.isEmpty()) {
            return PageResponse.from(new org.springframework.data.domain.PageImpl<Employee>(
                    List.of(),
                    PageRequest.of(page, size),
                    0
            ).map(this::toResponse));
        }
        Long branchId = employeeAccessService.branchScopeId(principal);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "firstName"));
        return PageResponse.from(employeeRepository
                .search(
                        currentOrgService.orgCode(),
                        blankToNull(search),
                        status,
                        departmentId,
                        branchId,
                        managedEmployeeIds.isEmpty() ? List.of(-1L) : managedEmployeeIds,
                        !managedEmployeeIds.isEmpty(),
                        pageable
                )
                .map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public EmployeeResponse get(Long id, UserPrincipal principal) {
        Employee employee = findEmployee(id);
        employeeAccessService.assertCanAccessEmployee(principal, employee);
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
        employee.setHrManager(findManager(request.hrManagerId(), null));
        Employee saved = employeeRepository.save(employee);
        saveEducation(saved, request.education());
        saveExperience(saved, request.experience());
        auditService.log("EMPLOYEE_CREATED", "Employee", saved.getId(), saved.getEmployeeCode());
        return toResponse(saved);
    }

    @Transactional
    public EmployeeResponse update(Long id, EmployeeRequest request, UserPrincipal principal) {
        Employee employee = findEmployee(id);
        employeeAccessService.assertCanAccessEmployee(principal, employee);
        if (!employee.getEmployeeCode().equalsIgnoreCase(request.employeeCode().trim())) {
            throw new BadRequestException("Employee code cannot be changed after creation");
        }
        ensureUniqueEmployee(request.employeeCode(), request.email(), id);
        Department department = findDepartment(request.departmentId());
        Designation designation = findDesignation(request.designationId());
        Branch branch = findBranch(request.branchId());
        employeeAccessService.assertCanAccessBranch(principal, branch.getId());
        ensureDesignationBelongsToDepartment(designation, department);

        apply(request, employee, department, designation, branch, employee.getEmployeeCode());
        employee.setHrManager(findManager(request.hrManagerId(), employee.getId()));
        Employee saved = employeeRepository.save(employee);
        saveEducation(saved, request.education());
        saveExperience(saved, request.experience());
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
        applyProfileFields(request, employee);
        employee.setManager(findManager(request.managerId(), employee.getId()));
        employee.setHrManager(findManager(request.hrManagerId(), employee.getId()));
        Employee saved = employeeRepository.save(employee);
        saveEducation(saved, request.education());
        saveExperience(saved, request.experience());
        auditService.log("EMPLOYEE_SELF_UPDATED", "Employee", saved.getId(), saved.getEmployeeCode());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public EmployeeHierarchyResponse hierarchy(UserPrincipal principal) {
        Employee current = findCurrentEmployee(principal);
        List<EmployeeHierarchyNodeResponse> ancestors = buildAncestors(current);
        EmployeeHierarchyNodeResponse currentNode = toNode(current);
        List<EmployeeHierarchyNodeResponse> descendants = buildDescendants(current);
        return new EmployeeHierarchyResponse(currentNode, ancestors, descendants);
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
        applyProfileFields(request, employee);
        employee.setJoiningDate(request.joiningDate());
        employee.setBaseSalary(request.baseSalary());
        employee.setBranch(branch);
        employee.setManager(findManager(request.managerId(), null));
        employee.setHrManager(findManager(request.hrManagerId(), null));
        employee.setStatus(request.status());
        employee.setDepartment(department);
        employee.setDesignation(designation);
    }

    private void applyProfileFields(EmployeeRequest request, Employee employee) {
        employee.setFirstName(request.firstName().trim());
        employee.setMiddleName(trim(request.middleName()));
        employee.setLastName(request.lastName().trim());
        employee.setEmail(request.email().trim().toLowerCase());
        employee.setPersonalEmail(trimToLower(request.personalEmail()));
        employee.setPhone(trim(request.phone()));
        employee.setAlternateMobileNumber(trim(request.alternateMobileNumber()));
        employee.setGender(trim(request.gender()));
        employee.setMaritalStatus(trim(request.maritalStatus()));
        employee.setBloodGroup(trim(request.bloodGroup()));
        employee.setNationality(trim(request.nationality()));
        employee.setAadhaarNumber(trim(request.aadhaarNumber()));
        employee.setDateOfBirth(request.dateOfBirth());
        employee.setConfirmationDate(request.confirmationDate());
        employee.setEmploymentType(trim(request.employmentType()));
        employee.setProbationPeriod(trim(request.probationPeriod()));
        employee.setBiometricId(trim(request.biometricId()));
        employee.setBankAccountNumber(trim(request.bankAccountNumber()));
        employee.setAccountHolderName(trim(request.accountHolderName()));
        employee.setBankName(trim(request.bankName()));
        employee.setIfscCode(trimToUpper(request.ifscCode()));
        employee.setTaxIdentificationNumber(trimToUpper(request.taxIdentificationNumber()));
        employee.setAddress(trim(request.address()));
        employee.setPermanentAddress(trim(request.permanentAddress()));
        employee.setEmergencyContactName(trim(request.emergencyContactName()));
        employee.setEmergencyRelationship(trim(request.emergencyRelationship()));
        employee.setEmergencyMobileNumber(trim(request.emergencyMobileNumber()));
        employee.setPrimarySkill(trim(request.primarySkill()));
        employee.setSecondarySkill(trim(request.secondarySkill()));
        employee.setCertifications(trim(request.certifications()));
        employee.setLanguagesKnown(trim(request.languagesKnown()));
        employee.setResignationDate(request.resignationDate());
        employee.setLastWorkingDate(request.lastWorkingDate());
        employee.setExitReason(trim(request.exitReason()));
        employee.setRelievingDate(request.relievingDate());
    }

    private void saveEducation(Employee employee, List<EmployeeEducationRequest> education) {
        String orgCode = employee.getOrgCode();
        employeeEducationRepository.deleteByOrgCodeAndEmployeeId(orgCode, employee.getId());
        if (education == null || education.isEmpty()) {
            return;
        }
        education.stream()
                .filter(item -> hasAnyEducationValue(item))
                .forEach(item -> {
                    EmployeeEducation record = new EmployeeEducation();
                    record.setOrgCode(orgCode);
                    record.setEmployee(employee);
                    record.setQualification(trim(item.qualification()));
                    record.setInstitution(trim(item.institution()));
                    record.setUniversity(trim(item.university()));
                    record.setYearOfPassing(trim(item.yearOfPassing()));
                    record.setScore(trim(item.score()));
                    record.setSpecialization(trim(item.specialization()));
                    employeeEducationRepository.save(record);
                });
    }

    private void saveExperience(Employee employee, List<EmployeeExperienceRequest> experience) {
        String orgCode = employee.getOrgCode();
        employeeExperienceRepository.deleteByOrgCodeAndEmployeeId(orgCode, employee.getId());
        if (experience == null || experience.isEmpty()) {
            return;
        }
        experience.stream()
                .filter(item -> hasAnyExperienceValue(item))
                .forEach(item -> {
                    EmployeeExperience record = new EmployeeExperience();
                    record.setOrgCode(orgCode);
                    record.setEmployee(employee);
                    record.setCompany(trim(item.company()));
                    record.setDesignation(trim(item.designation()));
                    record.setStartDate(item.startDate());
                    record.setEndDate(item.endDate());
                    record.setTotalExperience(trim(item.totalExperience()));
                    record.setLastDrawnSalary(trim(item.lastDrawnSalary()));
                    record.setReasonForLeaving(trim(item.reasonForLeaving()));
                    employeeExperienceRepository.save(record);
                });
    }

    private boolean hasAnyEducationValue(EmployeeEducationRequest item) {
        return notBlank(item.qualification()) || notBlank(item.institution()) || notBlank(item.university())
                || notBlank(item.yearOfPassing()) || notBlank(item.score()) || notBlank(item.specialization());
    }

    private boolean hasAnyExperienceValue(EmployeeExperienceRequest item) {
        return notBlank(item.company()) || notBlank(item.designation()) || item.startDate() != null || item.endDate() != null
                || notBlank(item.totalExperience()) || notBlank(item.lastDrawnSalary()) || notBlank(item.reasonForLeaving());
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
        return employeeAccessService.findCurrentEmployee(principal);
    }

    private Employee findManager(Long managerId, Long currentEmployeeId) {
        if (managerId == null) {
            return null;
        }
        Employee manager = findEmployee(managerId);
        if (currentEmployeeId != null && manager.getId().equals(currentEmployeeId)) {
            throw new BadRequestException("An employee cannot be their own manager");
        }
        return manager;
    }

    private String trim(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String trimToLower(String value) {
        String trimmed = trim(value);
        return trimmed == null ? null : trimmed.toLowerCase();
    }

    private String trimToUpper(String value) {
        String trimmed = trim(value);
        return trimmed == null ? null : trimmed.toUpperCase();
    }

    private boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private boolean isEmployee(UserPrincipal principal) {
        return employeeAccessService.isEmployee(principal);
    }

    private List<Long> scopedEmployeeIds(UserPrincipal principal) {
        return employeeAccessService.managedEmployeeIds(principal);
    }

    private EmployeeHierarchyNodeResponse toNode(Employee employee) {
        Employee manager = employee.getManager();
        List<EmployeeHierarchyNodeResponse> children = buildDescendants(employee);
        return new EmployeeHierarchyNodeResponse(
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getFirstName() + " " + employee.getLastName(),
                employee.getDesignation().getTitle(),
                employee.getDepartment().getName(),
                manager == null ? null : manager.getId(),
                manager == null ? null : manager.getEmployeeCode(),
                manager == null ? null : manager.getFirstName() + " " + manager.getLastName(),
                children.size(),
                employeeDocumentService.hasProfilePhoto(employee.getId()),
                children
        );
    }

    private List<EmployeeHierarchyNodeResponse> buildAncestors(Employee employee) {
        List<EmployeeHierarchyNodeResponse> ancestors = new ArrayList<>();
        Employee cursor = employee.getManager();
        while (cursor != null) {
            ancestors.add(toShallowNode(cursor));
            cursor = cursor.getManager();
        }
        Collections.reverse(ancestors);
        return ancestors;
    }

    private List<EmployeeHierarchyNodeResponse> buildDescendants(Employee employee) {
        return employeeRepository.findByOrgCodeAndManagerIdOrderByFirstNameAsc(currentOrgService.orgCode(), employee.getId())
                .stream()
                .map(this::toTreeNode)
                .toList();
    }

    private EmployeeHierarchyNodeResponse toTreeNode(Employee employee) {
        Employee manager = employee.getManager();
        List<EmployeeHierarchyNodeResponse> children = buildDescendants(employee);
        return new EmployeeHierarchyNodeResponse(
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getFirstName() + " " + employee.getLastName(),
                employee.getDesignation().getTitle(),
                employee.getDepartment().getName(),
                manager == null ? null : manager.getId(),
                manager == null ? null : manager.getEmployeeCode(),
                manager == null ? null : manager.getFirstName() + " " + manager.getLastName(),
                children.size(),
                employeeDocumentService.hasProfilePhoto(employee.getId()),
                children
        );
    }

    private EmployeeHierarchyNodeResponse toShallowNode(Employee employee) {
        Employee manager = employee.getManager();
        return new EmployeeHierarchyNodeResponse(
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getFirstName() + " " + employee.getLastName(),
                employee.getDesignation().getTitle(),
                employee.getDepartment().getName(),
                manager == null ? null : manager.getId(),
                manager == null ? null : manager.getEmployeeCode(),
                manager == null ? null : manager.getFirstName() + " " + manager.getLastName(),
                employeeRepository.findByOrgCodeAndManagerIdOrderByFirstNameAsc(currentOrgService.orgCode(), employee.getId()).size(),
                employeeDocumentService.hasProfilePhoto(employee.getId()),
                List.of()
        );
    }

    private EmployeeResponse toResponse(Employee employee) {
        String fullName = employee.getFirstName() + " " + employee.getLastName();
        return new EmployeeResponse(
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getFirstName(),
                employee.getMiddleName(),
                employee.getLastName(),
                fullName,
                employee.getEmail(),
                employee.getPersonalEmail(),
                employee.getPhone(),
                employee.getAlternateMobileNumber(),
                employee.getGender(),
                employee.getMaritalStatus(),
                employee.getBloodGroup(),
                employee.getNationality(),
                employee.getAadhaarNumber(),
                employee.getDateOfBirth(),
                employee.getJoiningDate(),
                employee.getConfirmationDate(),
                employee.getBaseSalary(),
                employee.getEmploymentType(),
                employee.getProbationPeriod(),
                employee.getBiometricId(),
                employee.getBankAccountNumber(),
                employee.getAccountHolderName(),
                employee.getBankName(),
                employee.getIfscCode(),
                employee.getTaxIdentificationNumber(),
                employee.getAddress(),
                employee.getPermanentAddress(),
                employee.getEmergencyContactName(),
                employee.getEmergencyRelationship(),
                employee.getEmergencyMobileNumber(),
                employee.getPrimarySkill(),
                employee.getSecondarySkill(),
                employee.getCertifications(),
                employee.getLanguagesKnown(),
                employee.getResignationDate(),
                employee.getLastWorkingDate(),
                employee.getExitReason(),
                employee.getRelievingDate(),
                employee.getBranch() == null ? null : employee.getBranch().getId(),
                employee.getBranch() == null ? null : employee.getBranch().getName(),
                employee.getManager() == null ? null : employee.getManager().getId(),
                employee.getManager() == null ? null : employee.getManager().getEmployeeCode(),
                employee.getManager() == null ? null : employee.getManager().getFirstName() + " " + employee.getManager().getLastName(),
                employee.getHrManager() == null ? null : employee.getHrManager().getId(),
                employee.getHrManager() == null ? null : employee.getHrManager().getEmployeeCode(),
                employee.getHrManager() == null ? null : employee.getHrManager().getFirstName() + " " + employee.getHrManager().getLastName(),
                employeeEducationRepository.findByOrgCodeAndEmployeeIdOrderByIdAsc(employee.getOrgCode(), employee.getId()).stream()
                        .map(this::toEducationResponse)
                        .toList(),
                employeeExperienceRepository.findByOrgCodeAndEmployeeIdOrderByIdAsc(employee.getOrgCode(), employee.getId()).stream()
                        .map(this::toExperienceResponse)
                        .toList(),
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

    private EmployeeEducationResponse toEducationResponse(EmployeeEducation item) {
        return new EmployeeEducationResponse(
                item.getId(),
                item.getQualification(),
                item.getInstitution(),
                item.getUniversity(),
                item.getYearOfPassing(),
                item.getScore(),
                item.getSpecialization()
        );
    }

    private EmployeeExperienceResponse toExperienceResponse(EmployeeExperience item) {
        return new EmployeeExperienceResponse(
                item.getId(),
                item.getCompany(),
                item.getDesignation(),
                item.getStartDate(),
                item.getEndDate(),
                item.getTotalExperience(),
                item.getLastDrawnSalary(),
                item.getReasonForLeaving()
        );
    }
}
