package com.payroll.backend.service;

import com.payroll.backend.domain.AppUser;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.ResignationRequest;
import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.domain.enums.ResignationStatus;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.resignation.ResignationCreateRequest;
import com.payroll.backend.dto.resignation.ResignationDecisionRequest;
import com.payroll.backend.dto.resignation.ResignationResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.AppUserRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.ResignationRequestRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ResignationService {

    private final ResignationRequestRepository resignationRepository;
    private final EmployeeRepository employeeRepository;
    private final AppUserRepository appUserRepository;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService employeeAccessService;
    private final PayrollLockService payrollLockService;
    private final ExitClearanceService exitClearanceService;
    private final AuditService auditService;

    @Transactional
    public PageResponse<ResignationResponse> search(
            String search, ResignationStatus status, boolean mine, int page, int size, UserPrincipal principal
    ) {
        applyDueResignations();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Long employeeId = mine || employeeAccessService.isEmployee(principal)
                ? employeeAccessService.findCurrentEmployee(principal).getId() : null;
        Long branchId = employeeAccessService.branchScopeId(principal);
        List<Long> managedIds = employeeAccessService.managedEmployeeIds(principal);
        if (!mine && employeeAccessService.isLead(principal) && managedIds.isEmpty()) {
            return PageResponse.from(new PageImpl<ResignationRequest>(List.of(), pageable, 0).map(this::toResponse));
        }
        return PageResponse.from(resignationRepository.search(
                currentOrgService.orgCode(), blankToNull(search), employeeId, branchId,
                managedIds.isEmpty() ? List.of(-1L) : managedIds, !mine && !managedIds.isEmpty(), status, pageable
        ).map(this::toResponse));
    }

    @Transactional
    public ResignationResponse create(ResignationCreateRequest request, UserPrincipal principal) {
        Employee employee = requestedEmployee(request.employeeId(), principal);
        if (employee.getStatus() == EmploymentStatus.TERMINATED || employee.getStatus() == EmploymentStatus.RESIGNED) {
            throw new BadRequestException("A separated employee cannot submit a resignation request");
        }
        LocalDate resignationDate = LocalDate.now();
        if (request.proposedLastWorkingDate().isBefore(resignationDate)) {
            throw new BadRequestException("Proposed last working date cannot be before the resignation date");
        }
        if (request.proposedLastWorkingDate().isBefore(employee.getJoiningDate())) {
            throw new BadRequestException("Last working date cannot be before the employee joining date");
        }
        payrollLockService.assertUnlocked(request.proposedLastWorkingDate());
        if (resignationRepository.existsByOrgCodeAndEmployeeIdAndStatusIn(
                currentOrgService.orgCode(), employee.getId(), List.of(ResignationStatus.PENDING, ResignationStatus.APPROVED))) {
            throw new BadRequestException("This employee already has a pending or approved resignation request");
        }

        ResignationRequest resignation = new ResignationRequest();
        resignation.setOrgCode(currentOrgService.orgCode());
        resignation.setEmployee(employee);
        resignation.setResignationDate(resignationDate);
        resignation.setProposedLastWorkingDate(request.proposedLastWorkingDate());
        resignation.setReason(request.reason().trim());
        resignation.setStatus(ResignationStatus.PENDING);
        resignation.setRequestedBy(currentUser(principal));
        ResignationRequest saved = resignationRepository.save(resignation);
        auditService.log("RESIGNATION_REQUESTED", "ResignationRequest", saved.getId(), employee.getEmployeeCode());
        return toResponse(saved);
    }

    @Transactional
    public ResignationResponse decide(Long id, ResignationDecisionRequest request, UserPrincipal principal) {
        ResignationRequest resignation = find(id);
        if (resignation.getStatus() != ResignationStatus.PENDING) {
            throw new BadRequestException("Only pending resignation requests can be decided");
        }
        if (request.status() != ResignationStatus.APPROVED && request.status() != ResignationStatus.REJECTED) {
            throw new BadRequestException("Resignation decision must be APPROVED or REJECTED");
        }
        LocalDate finalLastWorkingDate = request.approvedLastWorkingDate() == null
                ? resignation.getProposedLastWorkingDate() : request.approvedLastWorkingDate();
        if (request.status() == ResignationStatus.APPROVED) {
            if (finalLastWorkingDate.isBefore(resignation.getResignationDate())) {
                throw new BadRequestException("Approved last working date cannot be before resignation date");
            }
            if (request.relievingDate() != null && request.relievingDate().isBefore(finalLastWorkingDate)) {
                throw new BadRequestException("Relieving date cannot be before the approved last working date");
            }
            payrollLockService.assertUnlocked(finalLastWorkingDate);
            resignation.setApprovedLastWorkingDate(finalLastWorkingDate);
            resignation.setRelievingDate(request.relievingDate() == null ? finalLastWorkingDate : request.relievingDate());
            Employee employee = resignation.getEmployee();
            employee.setResignationDate(resignation.getResignationDate());
            employee.setLastWorkingDate(finalLastWorkingDate);
            employee.setRelievingDate(resignation.getRelievingDate());
            employee.setExitReason(resignation.getReason());
            employeeRepository.save(employee);
        }
        resignation.setStatus(request.status());
        resignation.setReviewerComment(blankToNull(request.reviewerComment()));
        resignation.setReviewedBy(currentUser(principal));
        resignation.setReviewedAt(Instant.now());
        ResignationRequest saved = resignationRepository.save(resignation);
        if (saved.getStatus() == ResignationStatus.APPROVED) applyDueResignations();
        auditService.log("RESIGNATION_DECIDED", "ResignationRequest", saved.getId(), saved.getStatus().name());
        return toResponse(saved);
    }

    @Transactional
    public ResignationResponse cancel(Long id, UserPrincipal principal) {
        ResignationRequest resignation = find(id);
        if (resignation.getStatus() != ResignationStatus.PENDING) {
            throw new BadRequestException("Only pending resignation requests can be withdrawn");
        }
        if (!resignation.getRequestedBy().getEmail().equalsIgnoreCase(principal.email()) && !isAdminOrHr(principal)) {
            throw new ResourceNotFoundException("Resignation request not found");
        }
        resignation.setStatus(ResignationStatus.CANCELLED);
        resignation.setReviewerComment("Withdrawn by requester");
        resignation.setReviewedBy(currentUser(principal));
        resignation.setReviewedAt(Instant.now());
        ResignationRequest saved = resignationRepository.save(resignation);
        auditService.log("RESIGNATION_CANCELLED", "ResignationRequest", saved.getId(), saved.getEmployee().getEmployeeCode());
        return toResponse(saved);
    }

    /** Marks an approved resignation as separated after the final working date has passed. */
    @Transactional
    public void applyDueResignations() {
        applyDueResignations(resignationRepository.findByOrgCodeAndStatusAndApprovedLastWorkingDateLessThanEqual(
                currentOrgService.orgCode(), ResignationStatus.APPROVED, LocalDate.now()), false);
    }

    /** Scheduler entry point; marks employees separated even when nobody is signed in. */
    @Transactional
    public void applyDueResignationsForAllOrganizations() {
        applyDueResignations(resignationRepository.findByStatusAndApprovedLastWorkingDateLessThanEqual(
                ResignationStatus.APPROVED, LocalDate.now()), true);
    }

    private void applyDueResignations(List<ResignationRequest> resignations, boolean systemRun) {
        for (ResignationRequest resignation : resignations) {
            if (resignation.getSeparatedAt() != null) continue;
            if (!resignation.getApprovedLastWorkingDate().isBefore(LocalDate.now())) continue;
            if (!exitClearanceService.canSeparate(resignation.getOrgCode(), resignation.getId())) continue;
            Employee employee = resignation.getEmployee();
            if (employee.getStatus() != EmploymentStatus.TERMINATED) {
                employee.setStatus(EmploymentStatus.RESIGNED);
                employeeRepository.save(employee);
            }
            resignation.setSeparatedAt(Instant.now());
            resignationRepository.save(resignation);
            if (systemRun) {
                auditService.logForOrg(resignation.getOrgCode(), "EMPLOYEE_RESIGNED", "ResignationRequest", resignation.getId(), employee.getEmployeeCode());
            } else {
                auditService.log("EMPLOYEE_RESIGNED", "ResignationRequest", resignation.getId(), employee.getEmployeeCode());
            }
        }
    }

    private Employee requestedEmployee(Long requestedEmployeeId, UserPrincipal principal) {
        Employee employee = requestedEmployeeId == null
                ? employeeAccessService.findCurrentEmployee(principal)
                : employeeRepository.findByOrgCodeAndId(currentOrgService.orgCode(), requestedEmployeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
        employeeAccessService.assertCanAccessEmployee(principal, employee);
        return employee;
    }

    private ResignationRequest find(Long id) {
        return resignationRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Resignation request not found"));
    }

    private AppUser currentUser(UserPrincipal principal) {
        return appUserRepository.findByOrgCodeAndEmailIgnoreCase(currentOrgService.orgCode(), principal.email())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private boolean isAdminOrHr(UserPrincipal principal) {
        return principal.getAuthorities().stream().anyMatch(authority ->
                "ROLE_ADMIN".equals(authority.getAuthority()) || "ROLE_HR".equals(authority.getAuthority()));
    }

    private ResignationResponse toResponse(ResignationRequest resignation) {
        Employee employee = resignation.getEmployee();
        return new ResignationResponse(resignation.getId(), employee.getId(), employee.getEmployeeCode(), fullName(employee),
                resignation.getResignationDate(), resignation.getProposedLastWorkingDate(), resignation.getApprovedLastWorkingDate(),
                resignation.getRelievingDate(), resignation.getReason(), resignation.getStatus(), resignation.getRequestedBy().getEmail(),
                resignation.getReviewedBy() == null ? null : resignation.getReviewedBy().getEmail(), resignation.getReviewerComment(),
                resignation.getReviewedAt(), resignation.getSeparatedAt(), resignation.getAssetClearanceCompletedAt(),
                resignation.getAssetClearanceCompletedBy(), resignation.getCreatedAt(), resignation.getUpdatedAt());
    }

    private String fullName(Employee employee) {
        return java.util.stream.Stream.of(employee.getFirstName(), employee.getMiddleName(), employee.getLastName())
                .filter(value -> value != null && !value.isBlank()).collect(java.util.stream.Collectors.joining(" "));
    }

    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
