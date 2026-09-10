package com.payroll.backend.service;

import com.payroll.backend.domain.AppUser;
import com.payroll.backend.domain.Branch;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.EmployeeTransferRequest;
import com.payroll.backend.domain.enums.EmployeeTransferStatus;
import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.transfer.EmployeeTransferCreateRequest;
import com.payroll.backend.dto.transfer.EmployeeTransferDecisionRequest;
import com.payroll.backend.dto.transfer.EmployeeTransferResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.AppUserRepository;
import com.payroll.backend.repository.BranchRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.EmployeeTransferRequestRepository;
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
public class EmployeeTransferService {

    private final EmployeeTransferRequestRepository transferRepository;
    private final EmployeeRepository employeeRepository;
    private final BranchRepository branchRepository;
    private final AppUserRepository appUserRepository;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService employeeAccessService;
    private final PayrollLockService payrollLockService;
    private final AuditService auditService;

    @Transactional
    public PageResponse<EmployeeTransferResponse> search(
            String search, EmployeeTransferStatus status, boolean mine, int page, int size, UserPrincipal principal
    ) {
        applyApprovedTransfersDue();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Long employeeId = mine || employeeAccessService.isEmployee(principal)
                ? employeeAccessService.findCurrentEmployee(principal).getId() : null;
        Long branchId = employeeAccessService.branchScopeId(principal);
        List<Long> managedIds = employeeAccessService.managedEmployeeIds(principal);
        if (!mine && employeeAccessService.isLead(principal) && managedIds.isEmpty()) {
            return PageResponse.from(new PageImpl<EmployeeTransferRequest>(List.of(), pageable, 0).map(this::toResponse));
        }
        return PageResponse.from(transferRepository.search(
                currentOrgService.orgCode(), blankToNull(search), employeeId, branchId,
                managedIds.isEmpty() ? List.of(-1L) : managedIds, !mine && !managedIds.isEmpty(), status, pageable
        ).map(this::toResponse));
    }

    @Transactional
    public EmployeeTransferResponse create(EmployeeTransferCreateRequest request, UserPrincipal principal) {
        Employee employee = requestedEmployee(request.employeeId(), principal);
        if (employee.getStatus() == EmploymentStatus.TERMINATED || employee.getStatus() == EmploymentStatus.RESIGNED) {
            throw new BadRequestException("A separated employee cannot be transferred");
        }
        if (employee.getBranch() == null) {
            throw new BadRequestException("The employee does not have a current branch");
        }
        if (request.effectiveDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Transfer effective date cannot be in the past");
        }
        payrollLockService.assertUnlocked(request.effectiveDate());
        Branch target = findActiveBranch(request.toBranchId());
        if (employee.getBranch().getId().equals(target.getId())) {
            throw new BadRequestException("Choose a different destination branch");
        }
        String orgCode = currentOrgService.orgCode();
        if (transferRepository.existsByOrgCodeAndEmployeeIdAndEffectiveDateAndStatus(
                orgCode, employee.getId(), request.effectiveDate(), EmployeeTransferStatus.APPROVED)) {
            throw new BadRequestException("Only one approved transfer is allowed for an employee on the same effective date");
        }
        if (transferRepository.existsByOrgCodeAndEmployeeIdAndStatus(orgCode, employee.getId(), EmployeeTransferStatus.PENDING)
                || transferRepository.existsByOrgCodeAndEmployeeIdAndStatusAndAppliedAtIsNull(
                orgCode, employee.getId(), EmployeeTransferStatus.APPROVED)) {
            throw new BadRequestException("This employee already has a pending or scheduled transfer request");
        }

        EmployeeTransferRequest transfer = new EmployeeTransferRequest();
        transfer.setOrgCode(currentOrgService.orgCode());
        transfer.setEmployee(employee);
        transfer.setFromBranch(employee.getBranch());
        transfer.setToBranch(target);
        transfer.setEffectiveDate(request.effectiveDate());
        transfer.setReason(request.reason().trim());
        transfer.setStatus(EmployeeTransferStatus.PENDING);
        transfer.setRequestedBy(currentUser(principal));
        EmployeeTransferRequest saved = transferRepository.save(transfer);
        auditService.log("EMPLOYEE_TRANSFER_REQUESTED", "EmployeeTransferRequest", saved.getId(), employee.getEmployeeCode());
        return toResponse(saved);
    }

    @Transactional
    public EmployeeTransferResponse decide(Long id, EmployeeTransferDecisionRequest request, UserPrincipal principal) {
        EmployeeTransferRequest transfer = find(id);
        if (transfer.getStatus() != EmployeeTransferStatus.PENDING) {
            throw new BadRequestException("Only pending transfer requests can be decided");
        }
        if (request.status() != EmployeeTransferStatus.APPROVED && request.status() != EmployeeTransferStatus.REJECTED) {
            throw new BadRequestException("Transfer decision must be APPROVED or REJECTED");
        }
        if (transfer.getEffectiveDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("A transfer cannot be approved after its effective date has passed");
        }
        payrollLockService.assertUnlocked(transfer.getEffectiveDate());
        if (request.status() == EmployeeTransferStatus.APPROVED && !transfer.getToBranch().isActive()) {
            throw new BadRequestException("The destination branch is inactive");
        }
        transfer.setStatus(request.status());
        transfer.setReviewerComment(blankToNull(request.reviewerComment()));
        transfer.setReviewedBy(currentUser(principal));
        transfer.setReviewedAt(Instant.now());
        EmployeeTransferRequest saved = transferRepository.save(transfer);
        if (saved.getStatus() == EmployeeTransferStatus.APPROVED && saved.getEffectiveDate().equals(LocalDate.now())) {
            applyApprovedTransfersDue();
        }
        auditService.log("EMPLOYEE_TRANSFER_DECIDED", "EmployeeTransferRequest", saved.getId(), saved.getStatus().name());
        return toResponse(saved);
    }

    @Transactional
    public EmployeeTransferResponse cancel(Long id, UserPrincipal principal) {
        EmployeeTransferRequest transfer = find(id);
        if (transfer.getStatus() != EmployeeTransferStatus.PENDING) {
            throw new BadRequestException("Only pending transfer requests can be cancelled");
        }
        if (!transfer.getRequestedBy().getEmail().equalsIgnoreCase(principal.email()) && !isAdminOrHr(principal)) {
            throw new ResourceNotFoundException("Transfer request not found");
        }
        transfer.setStatus(EmployeeTransferStatus.CANCELLED);
        transfer.setReviewerComment("Cancelled by requester");
        transfer.setReviewedBy(currentUser(principal));
        transfer.setReviewedAt(Instant.now());
        EmployeeTransferRequest saved = transferRepository.save(transfer);
        auditService.log("EMPLOYEE_TRANSFER_CANCELLED", "EmployeeTransferRequest", saved.getId(), saved.getEmployee().getEmployeeCode());
        return toResponse(saved);
    }

    /** Applies already approved transfers only on or after their approved effective date. */
    @Transactional
    public void applyApprovedTransfersDue() {
        applyApprovedTransfers(transferRepository.findByOrgCodeAndStatusAndEffectiveDateLessThanEqualOrderByEffectiveDateAsc(
                currentOrgService.orgCode(), EmployeeTransferStatus.APPROVED, LocalDate.now()), false);
    }

    /** Scheduler entry point; covers organizations that have no interactive request at the effective time. */
    @Transactional
    public void applyApprovedTransfersDueForAllOrganizations() {
        applyApprovedTransfers(transferRepository.findByStatusAndEffectiveDateLessThanEqualOrderByEffectiveDateAsc(
                EmployeeTransferStatus.APPROVED, LocalDate.now()), true);
    }

    private void applyApprovedTransfers(List<EmployeeTransferRequest> transfers, boolean systemRun) {
        for (EmployeeTransferRequest transfer : transfers) {
            if (transfer.getAppliedAt() != null) continue;
            Employee employee = transfer.getEmployee();
            if (employee.getStatus() == EmploymentStatus.TERMINATED || employee.getStatus() == EmploymentStatus.RESIGNED) continue;
            employee.setBranch(transfer.getToBranch());
            employeeRepository.save(employee);
            transfer.setAppliedAt(Instant.now());
            transferRepository.save(transfer);
            if (systemRun) {
                auditService.logForOrg(transfer.getOrgCode(), "EMPLOYEE_TRANSFER_APPLIED", "EmployeeTransferRequest", transfer.getId(), employee.getEmployeeCode());
            } else {
                auditService.log("EMPLOYEE_TRANSFER_APPLIED", "EmployeeTransferRequest", transfer.getId(), employee.getEmployeeCode());
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

    private Branch findActiveBranch(Long id) {
        Branch branch = branchRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found"));
        if (!branch.isActive()) throw new BadRequestException("Destination branch must be active");
        return branch;
    }

    private EmployeeTransferRequest find(Long id) {
        return transferRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Transfer request not found"));
    }

    private AppUser currentUser(UserPrincipal principal) {
        return appUserRepository.findByOrgCodeAndEmailIgnoreCase(currentOrgService.orgCode(), principal.email())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private boolean isAdminOrHr(UserPrincipal principal) {
        return principal.getAuthorities().stream().anyMatch(authority ->
                "ROLE_ADMIN".equals(authority.getAuthority()) || "ROLE_HR".equals(authority.getAuthority()));
    }

    private EmployeeTransferResponse toResponse(EmployeeTransferRequest transfer) {
        Employee employee = transfer.getEmployee();
        return new EmployeeTransferResponse(transfer.getId(), employee.getId(), employee.getEmployeeCode(), fullName(employee),
                transfer.getFromBranch().getId(), transfer.getFromBranch().getName(), transfer.getToBranch().getId(), transfer.getToBranch().getName(),
                transfer.getEffectiveDate(), transfer.getReason(), transfer.getStatus(), transfer.getRequestedBy().getEmail(),
                transfer.getReviewedBy() == null ? null : transfer.getReviewedBy().getEmail(), transfer.getReviewerComment(),
                transfer.getReviewedAt(), transfer.getAppliedAt(), transfer.getCreatedAt(), transfer.getUpdatedAt());
    }

    private String fullName(Employee employee) {
        return java.util.stream.Stream.of(employee.getFirstName(), employee.getMiddleName(), employee.getLastName())
                .filter(value -> value != null && !value.isBlank()).collect(java.util.stream.Collectors.joining(" "));
    }

    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
