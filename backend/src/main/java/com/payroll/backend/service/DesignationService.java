package com.payroll.backend.service;

import com.payroll.backend.domain.Department;
import com.payroll.backend.domain.Designation;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.designation.DesignationRequest;
import com.payroll.backend.dto.designation.DesignationResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.DepartmentRepository;
import com.payroll.backend.repository.DesignationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DesignationService {

    private final DesignationRepository designationRepository;
    private final DepartmentRepository departmentRepository;
    private final AuditService auditService;
    private final CurrentOrgService currentOrgService;

    @Transactional(readOnly = true)
    public PageResponse<DesignationResponse> search(String search, Long departmentId, Boolean active, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "title"));
        return PageResponse.from(designationRepository
                .search(currentOrgService.orgCode(), blankToNull(search), departmentId, active, pageable)
                .map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public DesignationResponse get(Long id) {
        return toResponse(findDesignation(id));
    }

    @Transactional
    public DesignationResponse create(DesignationRequest request) {
        ensureUniqueCode(request.code(), null);
        Department department = findDepartment(request.departmentId());

        Designation designation = new Designation();
        designation.setOrgCode(currentOrgService.orgCode());
        apply(request, designation, department);
        Designation saved = designationRepository.save(designation);
        auditService.log("DESIGNATION_CREATED", "Designation", saved.getId(), saved.getTitle());
        return toResponse(saved);
    }

    @Transactional
    public DesignationResponse update(Long id, DesignationRequest request) {
        Designation designation = findDesignation(id);
        ensureUniqueCode(request.code(), id);
        Department department = findDepartment(request.departmentId());

        apply(request, designation, department);
        Designation saved = designationRepository.save(designation);
        auditService.log("DESIGNATION_UPDATED", "Designation", saved.getId(), saved.getTitle());
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Designation designation = findDesignation(id);
        designation.setActive(false);
        designationRepository.save(designation);
        auditService.log("DESIGNATION_DEACTIVATED", "Designation", designation.getId(), designation.getTitle());
    }

    private void apply(DesignationRequest request, Designation designation, Department department) {
        designation.setTitle(request.title().trim());
        designation.setCode(request.code().trim().toUpperCase());
        designation.setDescription(request.description());
        designation.setDepartment(department);
        designation.setActive(request.active() == null || request.active());
    }

    private void ensureUniqueCode(String code, Long currentId) {
        designationRepository.findByOrgCodeAndCodeIgnoreCase(currentOrgService.orgCode(), code).ifPresent(existing -> {
            if (!existing.getId().equals(currentId)) {
                throw new BadRequestException("Designation code already exists");
            }
        });
    }

    private Department findDepartment(Long id) {
        return departmentRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
    }

    private Designation findDesignation(Long id) {
        return designationRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Designation not found"));
    }

    private DesignationResponse toResponse(Designation designation) {
        return new DesignationResponse(
                designation.getId(),
                designation.getTitle(),
                designation.getCode(),
                designation.getDescription(),
                designation.getDepartment().getId(),
                designation.getDepartment().getName(),
                designation.isActive(),
                designation.getCreatedAt(),
                designation.getUpdatedAt()
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
