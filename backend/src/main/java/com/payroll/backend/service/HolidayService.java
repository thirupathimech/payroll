package com.payroll.backend.service;

import com.payroll.backend.domain.*;
import com.payroll.backend.dto.holiday.HolidayRequest;
import com.payroll.backend.dto.holiday.HolidayResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.*;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HolidayService {
    private final HolidayRepository holidayRepository;
    private final BranchRepository branchRepository;
    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService employeeAccessService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<HolidayResponse> search(UserPrincipal principal) {
        return holidayRepository.search(currentOrgService.orgCode(), employeeAccessService.branchScopeId(principal))
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public HolidayResponse create(HolidayRequest request, UserPrincipal principal) {
        Branch branch = branchRepository.findByOrgCodeAndId(currentOrgService.orgCode(), request.branchId())
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found"));
        employeeAccessService.assertCanAccessBranch(principal, branch.getId());
        Department department = departmentRepository.findByOrgCodeAndId(currentOrgService.orgCode(), request.departmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
        Designation designation = designationRepository.findByOrgCodeAndId(currentOrgService.orgCode(), request.designationId())
                .orElseThrow(() -> new ResourceNotFoundException("Designation not found"));
        if (!designation.getDepartment().getId().equals(department.getId())) {
            throw new BadRequestException("Designation does not belong to the selected department");
        }
        Holiday holiday = holidayRepository.findByOrgCodeAndBranchIdAndDepartmentIdAndDesignationIdAndHolidayDate(
                        currentOrgService.orgCode(), branch.getId(), department.getId(), designation.getId(), request.date())
                .orElseGet(Holiday::new);
        holiday.setOrgCode(currentOrgService.orgCode());
        holiday.setBranch(branch); holiday.setDepartment(department); holiday.setDesignation(designation);
        holiday.setHolidayDate(request.date()); holiday.setTitle(request.title().trim());
        Holiday saved = holidayRepository.save(holiday);
        auditService.log("HOLIDAY_SAVED", "Holiday", saved.getId(), saved.getTitle());
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id, UserPrincipal principal) {
        Holiday holiday = holidayRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Holiday not found"));
        employeeAccessService.assertCanAccessBranch(principal, holiday.getBranch().getId());
        holidayRepository.delete(holiday);
        auditService.log("HOLIDAY_DELETED", "Holiday", id, holiday.getTitle());
    }

    private HolidayResponse toResponse(Holiday h) {
        return new HolidayResponse(h.getId(), h.getBranch().getId(), h.getBranch().getName(), h.getDepartment().getId(),
                h.getDepartment().getName(), h.getDesignation().getId(), h.getDesignation().getTitle(), h.getHolidayDate(),
                h.getTitle(), h.getCreatedAt(), h.getUpdatedAt());
    }
}
