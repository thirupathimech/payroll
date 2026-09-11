package com.payroll.backend.service;

import com.payroll.backend.domain.Branch;
import com.payroll.backend.domain.Department;
import com.payroll.backend.domain.Designation;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.OvertimePolicy;
import com.payroll.backend.domain.enums.OvertimePayRateType;
import com.payroll.backend.dto.overtime.OvertimeEligibilityResponse;
import com.payroll.backend.dto.overtime.OvertimePolicyRequest;
import com.payroll.backend.dto.overtime.OvertimePolicyResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.BranchRepository;
import com.payroll.backend.repository.DepartmentRepository;
import com.payroll.backend.repository.DesignationRepository;
import com.payroll.backend.repository.OvertimePolicyRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OvertimePolicyService {

    private final OvertimePolicyRepository overtimePolicyRepository;
    private final BranchRepository branchRepository;
    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService employeeAccessService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<OvertimePolicyResponse> list() {
        return overtimePolicyRepository.findAllForOrg(currentOrgService.orgCode()).stream().map(this::toResponse).toList();
    }

    /** Saving the same Branch / Department / Designation scope updates its hourly OT rate. */
    @Transactional
    public OvertimePolicyResponse save(OvertimePolicyRequest request) {
        String orgCode = currentOrgService.orgCode();
        Branch branch = branchRepository.findByOrgCodeAndId(orgCode, request.branchId())
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found"));
        Department department = departmentRepository.findByOrgCodeAndId(orgCode, request.departmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
        Designation designation = designationRepository.findByOrgCodeAndId(orgCode, request.designationId())
                .orElseThrow(() -> new ResourceNotFoundException("Designation not found"));
        if (!designation.getDepartment().getId().equals(department.getId())) {
            throw new BadRequestException("Designation does not belong to the selected department");
        }
        OvertimePolicy policy = overtimePolicyRepository
                .findByOrgCodeAndBranchIdAndDepartmentIdAndDesignationId(orgCode, branch.getId(), department.getId(), designation.getId())
                .orElseGet(OvertimePolicy::new);
        policy.setOrgCode(orgCode);
        policy.setBranch(branch);
        policy.setDepartment(department);
        policy.setDesignation(designation);
        policy.setPayRateType(request.payRateType());
        policy.setPayRateValue(money(request.payRateValue()));
        policy.setActive(true);
        OvertimePolicy saved = overtimePolicyRepository.save(policy);
        auditService.log("OVERTIME_POLICY_SAVED", "OvertimePolicy", saved.getId(), scope(saved));
        return toResponse(saved);
    }

    @Transactional
    public void deactivate(Long id) {
        OvertimePolicy policy = overtimePolicyRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Overtime policy not found"));
        policy.setActive(false);
        overtimePolicyRepository.save(policy);
        auditService.log("OVERTIME_POLICY_DEACTIVATED", "OvertimePolicy", id, scope(policy));
    }

    @Transactional(readOnly = true)
    public OvertimeEligibilityResponse myEligibility(UserPrincipal principal) {
        try {
            return activePolicyFor(employeeAccessService.findCurrentEmployee(principal))
                    .map(policy -> new OvertimeEligibilityResponse(true, policy.getPayRateType(), money(policy.getPayRateValue())))
                    .orElseGet(() -> new OvertimeEligibilityResponse(false, null, null));
        } catch (ResourceNotFoundException exception) {
            return new OvertimeEligibilityResponse(false, null, null);
        }
    }

    @Transactional(readOnly = true)
    public Optional<OvertimePolicy> activePolicyFor(Employee employee) {
        if (employee == null || employee.getBranch() == null || employee.getDepartment() == null || employee.getDesignation() == null) {
            return Optional.empty();
        }
        return overtimePolicyRepository.findByOrgCodeAndBranchIdAndDepartmentIdAndDesignationIdAndActiveTrue(
                currentOrgService.orgCode(), employee.getBranch().getId(), employee.getDepartment().getId(), employee.getDesignation().getId()
        );
    }

    public OvertimePolicy requireActivePolicy(Employee employee) {
        return activePolicyFor(employee).orElseThrow(() -> new BadRequestException(
                "This employee is not eligible for overtime. An active OT policy is required for their branch, department, and designation."
        ));
    }

    private OvertimePolicyResponse toResponse(OvertimePolicy policy) {
        return new OvertimePolicyResponse(policy.getId(), policy.getBranch().getId(), policy.getBranch().getName(),
                policy.getDepartment().getId(), policy.getDepartment().getName(), policy.getDesignation().getId(),
                policy.getDesignation().getTitle(), policy.getPayRateType(), money(policy.getPayRateValue()), policy.isActive(),
                policy.getCreatedAt(), policy.getUpdatedAt());
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String scope(OvertimePolicy policy) {
        return policy.getBranch().getName() + " / " + policy.getDepartment().getName() + " / " + policy.getDesignation().getTitle();
    }
}
