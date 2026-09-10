package com.payroll.backend.controller;

import com.payroll.backend.domain.ReimbursementAttachment;
import com.payroll.backend.domain.enums.ReimbursementStatus;
import com.payroll.backend.dto.common.MessageResponse;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.reimbursement.ReimbursementAttachmentResponse;
import com.payroll.backend.dto.reimbursement.ReimbursementCreateRequest;
import com.payroll.backend.dto.reimbursement.ReimbursementDecisionRequest;
import com.payroll.backend.dto.reimbursement.ReimbursementResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.ReimbursementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/reimbursements")
public class ReimbursementController {
    private final ReimbursementService reimbursementService;

    @GetMapping
    public PageResponse<ReimbursementResponse> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ReimbursementStatus status,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return reimbursementService.search(search, status, mine, page, size, principal);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD','EMPLOYEE')")
    public ReimbursementResponse create(@Valid @RequestBody ReimbursementCreateRequest request, @AuthenticationPrincipal UserPrincipal principal) {
        return reimbursementService.create(request, principal);
    }

    @PatchMapping("/{id}/decision")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD')")
    public ReimbursementResponse decide(
            @PathVariable Long id, @Valid @RequestBody ReimbursementDecisionRequest request, @AuthenticationPrincipal UserPrincipal principal
    ) {
        return reimbursementService.decide(id, request, principal);
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD','EMPLOYEE')")
    public ReimbursementResponse cancel(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return reimbursementService.cancel(id, principal);
    }

    @PostMapping(value = "/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD','EMPLOYEE')")
    public ReimbursementAttachmentResponse uploadAttachment(
            @PathVariable Long id, @RequestPart("file") MultipartFile file, @AuthenticationPrincipal UserPrincipal principal
    ) {
        return reimbursementService.uploadAttachment(id, file, principal);
    }

    @GetMapping("/{id}/attachments/{attachmentId}/download")
    public ResponseEntity<ByteArrayResource> downloadAttachment(
            @PathVariable Long id, @PathVariable Long attachmentId, @AuthenticationPrincipal UserPrincipal principal
    ) {
        return attachmentResponse(reimbursementService.getAttachment(id, attachmentId, principal), true);
    }

    @GetMapping("/{id}/attachments/{attachmentId}/preview")
    public ResponseEntity<ByteArrayResource> previewAttachment(
            @PathVariable Long id, @PathVariable Long attachmentId, @AuthenticationPrincipal UserPrincipal principal
    ) {
        return attachmentResponse(reimbursementService.getAttachment(id, attachmentId, principal), false);
    }

    @DeleteMapping("/{id}/attachments/{attachmentId}")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD','EMPLOYEE')")
    public MessageResponse deleteAttachment(
            @PathVariable Long id, @PathVariable Long attachmentId, @AuthenticationPrincipal UserPrincipal principal
    ) {
        reimbursementService.deleteAttachment(id, attachmentId, principal);
        return new MessageResponse("Reimbursement attachment deleted");
    }

    private ResponseEntity<ByteArrayResource> attachmentResponse(ReimbursementAttachment attachment, boolean download) {
        ContentDisposition disposition = download
                ? ContentDisposition.attachment().filename(attachment.getOriginalFileName()).build()
                : ContentDisposition.inline().filename(attachment.getOriginalFileName()).build();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(attachment.getFileType()))
                .contentLength(attachment.getFileSize()).header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(new ByteArrayResource(attachment.getFileData()));
    }
}
