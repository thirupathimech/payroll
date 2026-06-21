package com.payroll.backend.service;

import com.payroll.backend.domain.Department;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.department.DepartmentRequest;
import com.payroll.backend.dto.department.DepartmentResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<DepartmentResponse> search(String search, Boolean active, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name"));
        return PageResponse.from(departmentRepository.search(blankToNull(search), active, pageable).map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public List<DepartmentResponse> listActive() {
        return departmentRepository.search(null, true, PageRequest.of(0, 500, Sort.by("name")))
                .map(this::toResponse)
                .getContent();
    }

    @Transactional(readOnly = true)
    public DepartmentResponse get(Long id) {
        return toResponse(findDepartment(id));
    }

    @Transactional
    public DepartmentResponse create(DepartmentRequest request) {
        ensureUniqueNameAndCode(request.name(), request.code(), null);
        Department department = new Department();
        apply(request, department);
        Department saved = departmentRepository.save(department);
        auditService.log("DEPARTMENT_CREATED", "Department", saved.getId(), saved.getName());
        return toResponse(saved);
    }

    @Transactional
    public DepartmentResponse update(Long id, DepartmentRequest request) {
        Department department = findDepartment(id);
        ensureUniqueNameAndCode(request.name(), request.code(), id);
        apply(request, department);
        Department saved = departmentRepository.save(department);
        auditService.log("DEPARTMENT_UPDATED", "Department", saved.getId(), saved.getName());
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Department department = findDepartment(id);
        department.setActive(false);
        departmentRepository.save(department);
        auditService.log("DEPARTMENT_DEACTIVATED", "Department", department.getId(), department.getName());
    }

    private Department findDepartment(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
    }

    private void apply(DepartmentRequest request, Department department) {
        department.setName(request.name().trim());
        department.setCode(request.code().trim().toUpperCase());
        department.setDescription(request.description());
        department.setActive(request.active() == null || request.active());
    }

    private void ensureUniqueNameAndCode(String name, String code, Long currentId) {
        departmentRepository.findByNameIgnoreCase(name).ifPresent(existing -> {
            if (!existing.getId().equals(currentId)) {
                throw new BadRequestException("Department name already exists");
            }
        });
        departmentRepository.findByCodeIgnoreCase(code).ifPresent(existing -> {
            if (!existing.getId().equals(currentId)) {
                throw new BadRequestException("Department code already exists");
            }
        });
    }

    private DepartmentResponse toResponse(Department department) {
        return new DepartmentResponse(
                department.getId(),
                department.getName(),
                department.getCode(),
                department.getDescription(),
                department.isActive(),
                department.getCreatedAt(),
                department.getUpdatedAt()
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
