package com.payroll.backend.service;

import com.payroll.backend.domain.AppUser;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.PayrollRun;
import com.payroll.backend.domain.ReimbursementAttachment;
import com.payroll.backend.domain.ReimbursementRequest;
import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.domain.enums.ReimbursementStatus;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.reimbursement.ReimbursementAttachmentResponse;
import com.payroll.backend.dto.reimbursement.ReimbursementCreateRequest;
import com.payroll.backend.dto.reimbursement.ReimbursementDecisionRequest;
import com.payroll.backend.dto.reimbursement.ReimbursementResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.AppUserRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.ReimbursementAttachmentRepository;
import com.payroll.backend.repository.ReimbursementRequestRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReimbursementService {

    private static final int MAX_ATTACHMENTS = 5;
    private static final long MAX_ATTACHMENT_SIZE = 5L * 1024L * 1024L;
    private static final Set<String> ALLOWED_FILE_TYPES = Set.of(
            MediaType.APPLICATION_PDF_VALUE, "image/jpeg", "image/jpg", "image/png", "image/webp"
    );
    private static final Set<String> PREVIEW_TYPES = Set.of(
            MediaType.APPLICATION_PDF_VALUE, "image/jpeg", "image/jpg", "image/png", "image/webp"
    );

    private final ReimbursementRequestRepository reimbursementRepository;
    private final ReimbursementAttachmentRepository attachmentRepository;
    private final EmployeeRepository employeeRepository;
    private final AppUserRepository appUserRepository;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService employeeAccessService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<ReimbursementResponse> search(
            String search, ReimbursementStatus status, boolean mine, int page, int size, UserPrincipal principal
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Long employeeId = mine || employeeAccessService.isEmployee(principal)
                ? employeeAccessService.findCurrentEmployee(principal).getId() : null;
        Long branchId = employeeAccessService.branchScopeId(principal);
        List<Long> managedIds = employeeAccessService.managedEmployeeIds(principal);
        if (!mine && employeeAccessService.isLead(principal) && managedIds.isEmpty()) {
            return PageResponse.from(new PageImpl<ReimbursementRequest>(List.of(), pageable, 0).map(this::toResponse));
        }
        return PageResponse.from(reimbursementRepository.search(
                currentOrgService.orgCode(), blankToNull(search), employeeId, branchId,
                managedIds.isEmpty() ? List.of(-1L) : managedIds, !mine && !managedIds.isEmpty(), status, pageable
        ).map(this::toResponse));
    }

    @Transactional
    public ReimbursementResponse create(ReimbursementCreateRequest request, UserPrincipal principal) {
        Employee employee = requestedEmployee(request.employeeId(), principal);
        if (employee.getStatus() == EmploymentStatus.TERMINATED || employee.getStatus() == EmploymentStatus.RESIGNED) {
            throw new BadRequestException("A separated employee cannot submit a reimbursement");
        }
        if (request.expenseDate().isAfter(LocalDate.now())) {
            throw new BadRequestException("Expense date cannot be in the future");
        }
        ReimbursementRequest reimbursement = new ReimbursementRequest();
        reimbursement.setOrgCode(currentOrgService.orgCode());
        reimbursement.setEmployee(employee);
        reimbursement.setExpenseDate(request.expenseDate());
        reimbursement.setCategory(request.category().trim());
        reimbursement.setAmount(money(request.amount()));
        reimbursement.setDescription(request.description().trim());
        reimbursement.setStatus(ReimbursementStatus.PENDING);
        reimbursement.setRequestedBy(currentUser(principal));
        ReimbursementRequest saved = reimbursementRepository.save(reimbursement);
        auditService.log("REIMBURSEMENT_REQUESTED", "ReimbursementRequest", saved.getId(), employee.getEmployeeCode());
        return toResponse(saved);
    }

    @Transactional
    public ReimbursementResponse decide(Long id, ReimbursementDecisionRequest request, UserPrincipal principal) {
        ReimbursementRequest reimbursement = find(id);
        employeeAccessService.assertCanAccessEmployee(principal, reimbursement.getEmployee());
        if (reimbursement.getStatus() != ReimbursementStatus.PENDING) {
            throw new BadRequestException("Only pending reimbursements can be decided");
        }
        if (request.status() != ReimbursementStatus.APPROVED && request.status() != ReimbursementStatus.REJECTED) {
            throw new BadRequestException("Reimbursement decision must be APPROVED or REJECTED");
        }
        reimbursement.setStatus(request.status());
        reimbursement.setReviewerComment(blankToNull(request.reviewerComment()));
        reimbursement.setReviewedBy(currentUser(principal));
        reimbursement.setReviewedAt(Instant.now());
        ReimbursementRequest saved = reimbursementRepository.save(reimbursement);
        auditService.log("REIMBURSEMENT_DECIDED", "ReimbursementRequest", saved.getId(), saved.getStatus().name());
        return toResponse(saved);
    }

    @Transactional
    public ReimbursementResponse cancel(Long id, UserPrincipal principal) {
        ReimbursementRequest reimbursement = find(id);
        if (reimbursement.getStatus() != ReimbursementStatus.PENDING) {
            throw new BadRequestException("Only pending reimbursements can be cancelled");
        }
        if (!reimbursement.getRequestedBy().getEmail().equalsIgnoreCase(principal.email()) && !isAdminOrHr(principal)) {
            throw new ResourceNotFoundException("Reimbursement request not found");
        }
        reimbursement.setStatus(ReimbursementStatus.CANCELLED);
        reimbursement.setReviewerComment("Cancelled by requester");
        reimbursement.setReviewedBy(currentUser(principal));
        reimbursement.setReviewedAt(Instant.now());
        ReimbursementRequest saved = reimbursementRepository.save(reimbursement);
        auditService.log("REIMBURSEMENT_CANCELLED", "ReimbursementRequest", saved.getId(), saved.getEmployee().getEmployeeCode());
        return toResponse(saved);
    }

    @Transactional
    public ReimbursementAttachmentResponse uploadAttachment(Long reimbursementId, MultipartFile file, UserPrincipal principal) {
        ReimbursementRequest reimbursement = find(reimbursementId);
        assertCanManageAttachments(reimbursement, principal);
        if (attachmentRepository.countByOrgCodeAndReimbursementRequestId(currentOrgService.orgCode(), reimbursementId) >= MAX_ATTACHMENTS) {
            throw new BadRequestException("A reimbursement can have at most " + MAX_ATTACHMENTS + " attachments");
        }
        validateFile(file);
        try {
            String originalName = file.getOriginalFilename() == null ? "receipt" : file.getOriginalFilename();
            String extension = extensionOf(originalName);
            ReimbursementAttachment attachment = new ReimbursementAttachment();
            attachment.setOrgCode(currentOrgService.orgCode());
            attachment.setReimbursementRequest(reimbursement);
            attachment.setOriginalFileName(originalName);
            attachment.setFileExtension(extension);
            attachment.setFileName(UUID.randomUUID() + (extension.isBlank() ? "" : "." + extension));
            attachment.setFileType(file.getContentType());
            attachment.setFileSize(file.getSize());
            attachment.setUploadedAt(Instant.now());
            attachment.setUploadedBy(principal.email());
            attachment.setFileData(file.getBytes());
            ReimbursementAttachment saved = attachmentRepository.save(attachment);
            auditService.log("REIMBURSEMENT_ATTACHMENT_UPLOADED", "ReimbursementAttachment", saved.getId(), reimbursement.getId().toString());
            return toAttachmentResponse(saved);
        } catch (IOException exception) {
            throw new BadRequestException("Unable to read uploaded receipt");
        }
    }

    @Transactional(readOnly = true)
    public ReimbursementAttachment getAttachment(Long reimbursementId, Long attachmentId, UserPrincipal principal) {
        ReimbursementRequest reimbursement = find(reimbursementId);
        employeeAccessService.assertCanAccessEmployee(principal, reimbursement.getEmployee());
        return attachmentRepository.findByOrgCodeAndReimbursementRequestIdAndId(currentOrgService.orgCode(), reimbursementId, attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Reimbursement attachment not found"));
    }

    @Transactional
    public void deleteAttachment(Long reimbursementId, Long attachmentId, UserPrincipal principal) {
        ReimbursementRequest reimbursement = find(reimbursementId);
        assertCanManageAttachments(reimbursement, principal);
        ReimbursementAttachment attachment = attachmentRepository.findByOrgCodeAndReimbursementRequestIdAndId(
                currentOrgService.orgCode(), reimbursementId, attachmentId
        ).orElseThrow(() -> new ResourceNotFoundException("Reimbursement attachment not found"));
        attachmentRepository.delete(attachment);
        auditService.log("REIMBURSEMENT_ATTACHMENT_DELETED", "ReimbursementAttachment", attachmentId, reimbursementId.toString());
    }

    /** Reserves approved reimbursements for a draft run, preventing duplicate payout in another run. */
    @Transactional
    public Map<Long, List<ReimbursementRequest>> allocateApprovedToPayroll(PayrollRun payrollRun) {
        Instant approvalCutoff = payrollRun.getPeriodEnd().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        List<ReimbursementRequest> requests = reimbursementRepository.findApprovedReadyForPayroll(
                currentOrgService.orgCode(), ReimbursementStatus.APPROVED, payrollRun.getPeriodEnd(), approvalCutoff
        );
        requests.forEach(request -> request.setPayrollRun(payrollRun));
        reimbursementRepository.saveAll(requests);
        return requests.stream().collect(Collectors.groupingBy(request -> request.getEmployee().getId()));
    }

    @Transactional
    public void releaseDraftPayrollReservations(Long payrollRunId) {
        reimbursementRepository.releaseFromDraftPayroll(currentOrgService.orgCode(), payrollRunId, ReimbursementStatus.APPROVED);
    }

    /** Called only when a payroll snapshot becomes immutable. */
    @Transactional
    public void markPayrollReimbursementsPaid(PayrollRun payrollRun) {
        List<ReimbursementRequest> requests = reimbursementRepository.findByOrgCodeAndPayrollRunId(currentOrgService.orgCode(), payrollRun.getId());
        Instant paidAt = Instant.now();
        requests.stream().filter(request -> request.getStatus() == ReimbursementStatus.APPROVED).forEach(request -> {
            request.setStatus(ReimbursementStatus.PAID);
            request.setPaidAt(paidAt);
        });
        reimbursementRepository.saveAll(requests);
        if (!requests.isEmpty()) auditService.log("REIMBURSEMENTS_PAID", "PayrollRun", payrollRun.getId(), "count=" + requests.size());
    }

    private void assertCanManageAttachments(ReimbursementRequest reimbursement, UserPrincipal principal) {
        if (reimbursement.getStatus() != ReimbursementStatus.PENDING) {
            throw new BadRequestException("Receipts can only be changed while the reimbursement is pending");
        }
        if (!reimbursement.getRequestedBy().getEmail().equalsIgnoreCase(principal.email()) && !isAdminOrHr(principal)) {
            throw new ResourceNotFoundException("Reimbursement request not found");
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new BadRequestException("Receipt attachment is required");
        if (file.getSize() > MAX_ATTACHMENT_SIZE) throw new BadRequestException("Each receipt must be 5 MB or smaller");
        if (file.getContentType() == null || !ALLOWED_FILE_TYPES.contains(file.getContentType())) {
            throw new BadRequestException("Only PDF, JPG, PNG, and WEBP receipt files are allowed");
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

    private ReimbursementRequest find(Long id) {
        return reimbursementRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Reimbursement request not found"));
    }

    private AppUser currentUser(UserPrincipal principal) {
        return appUserRepository.findByOrgCodeAndEmailIgnoreCase(currentOrgService.orgCode(), principal.email())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private ReimbursementResponse toResponse(ReimbursementRequest reimbursement) {
        Employee employee = reimbursement.getEmployee();
        List<ReimbursementAttachmentResponse> attachments = attachmentRepository
                .findByOrgCodeAndReimbursementRequestIdOrderByUploadedAtAsc(currentOrgService.orgCode(), reimbursement.getId())
                .stream().map(this::toAttachmentResponse).toList();
        return new ReimbursementResponse(reimbursement.getId(), employee.getId(), employee.getEmployeeCode(), fullName(employee),
                reimbursement.getExpenseDate(), reimbursement.getCategory(), money(reimbursement.getAmount()), reimbursement.getDescription(), reimbursement.getStatus(),
                reimbursement.getRequestedBy().getEmail(), reimbursement.getReviewedBy() == null ? null : reimbursement.getReviewedBy().getEmail(),
                reimbursement.getReviewerComment(), reimbursement.getReviewedAt(), reimbursement.getPayrollRun() == null ? null : reimbursement.getPayrollRun().getId(),
                reimbursement.getPaidAt(), attachments, reimbursement.getCreatedAt(), reimbursement.getUpdatedAt());
    }

    private ReimbursementAttachmentResponse toAttachmentResponse(ReimbursementAttachment attachment) {
        return new ReimbursementAttachmentResponse(attachment.getId(), attachment.getOriginalFileName(), attachment.getFileType(),
                attachment.getFileExtension(), attachment.getFileSize(), attachment.getUploadedBy(), attachment.getUploadedAt(),
                PREVIEW_TYPES.contains(attachment.getFileType()));
    }

    private boolean isAdminOrHr(UserPrincipal principal) {
        return principal.getAuthorities().stream().anyMatch(authority ->
                "ROLE_ADMIN".equals(authority.getAuthority()) || "ROLE_HR".equals(authority.getAuthority()));
    }

    private String extensionOf(String fileName) {
        int index = fileName.lastIndexOf('.');
        return index < 0 || index == fileName.length() - 1 ? "" : fileName.substring(index + 1).toLowerCase(Locale.ROOT);
    }

    private BigDecimal money(BigDecimal amount) { return amount.setScale(2, RoundingMode.HALF_UP); }
    private String fullName(Employee employee) {
        return java.util.stream.Stream.of(employee.getFirstName(), employee.getMiddleName(), employee.getLastName())
                .filter(value -> value != null && !value.isBlank()).collect(Collectors.joining(" "));
    }
    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
