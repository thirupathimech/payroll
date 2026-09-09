package com.payroll.backend.service;

import com.payroll.backend.domain.*;
import com.payroll.backend.dto.weekoff.*;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.*;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service @RequiredArgsConstructor
public class WeekOffExclusionService {
    private final WeekOffExclusionRepository repository;
    private final BranchRepository branchRepository;
    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService accessService;
    private final AuditService auditService;
    private final PayrollLockService payrollLockService;

    @Transactional(readOnly = true)
    public List<WeekOffExclusionResponse> search(UserPrincipal principal) {
        return repository.search(currentOrgService.orgCode(), accessService.branchScopeId(principal)).stream().map(this::response).toList();
    }

    @Transactional
    public WeekOffExclusionResponse create(WeekOffExclusionRequest request, UserPrincipal principal) {
        payrollLockService.assertUnlocked(request.date());
        Branch branch = branchRepository.findByOrgCodeAndId(currentOrgService.orgCode(), request.branchId()).orElseThrow(() -> new ResourceNotFoundException("Branch not found"));
        accessService.assertCanAccessBranch(principal, branch.getId());
        Department department = departmentRepository.findByOrgCodeAndId(currentOrgService.orgCode(), request.departmentId()).orElseThrow(() -> new ResourceNotFoundException("Department not found"));
        Designation designation = designationRepository.findByOrgCodeAndId(currentOrgService.orgCode(), request.designationId()).orElseThrow(() -> new ResourceNotFoundException("Designation not found"));
        if (!designation.getDepartment().getId().equals(department.getId())) throw new com.payroll.backend.exception.BadRequestException("Designation does not belong to the selected department");
        WeekOffExclusion item = repository.findByOrgCodeAndBranchIdAndDepartmentIdAndDesignationIdAndExcludedDate(currentOrgService.orgCode(), branch.getId(), department.getId(), designation.getId(), request.date()).orElseGet(WeekOffExclusion::new);
        item.setOrgCode(currentOrgService.orgCode()); item.setBranch(branch); item.setDepartment(department); item.setDesignation(designation); item.setExcludedDate(request.date());
        WeekOffExclusion saved = repository.save(item); auditService.log("WEEK_OFF_EXCLUSION_SAVED", "WeekOffExclusion", saved.getId(), request.date().toString()); return response(saved);
    }

    @Transactional
    public void delete(Long id, UserPrincipal principal) {
        WeekOffExclusion item = repository.findByOrgCodeAndId(currentOrgService.orgCode(), id).orElseThrow(() -> new ResourceNotFoundException("Week off exclusion not found"));
        accessService.assertCanAccessBranch(principal, item.getBranch().getId()); payrollLockService.assertUnlocked(item.getExcludedDate()); repository.delete(item); auditService.log("WEEK_OFF_EXCLUSION_DELETED", "WeekOffExclusion", id, item.getExcludedDate().toString());
    }

    private WeekOffExclusionResponse response(WeekOffExclusion e) { return new WeekOffExclusionResponse(e.getId(), e.getBranch().getId(), e.getBranch().getName(), e.getDepartment().getId(), e.getDepartment().getName(), e.getDesignation().getId(), e.getDesignation().getTitle(), e.getExcludedDate(), e.getCreatedAt(), e.getUpdatedAt()); }
}
