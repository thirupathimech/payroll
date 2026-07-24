package com.payroll.backend.controller;

import com.payroll.backend.domain.EmployeeDocument;
import com.payroll.backend.dto.common.MessageResponse;
import com.payroll.backend.dto.employee.EmployeeDocumentResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.EmployeeDocumentService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/employees/{employeeId}")
public class EmployeeDocumentController {

    private final EmployeeDocumentService employeeDocumentService;

    @GetMapping("/documents")
    public List<EmployeeDocumentResponse> listDocuments(
            @PathVariable Long employeeId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return employeeDocumentService.listDocuments(employeeId, principal);
    }

    @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD')")
    public EmployeeDocumentResponse uploadDocument(
            @PathVariable Long employeeId,
            @RequestParam("file") MultipartFile file,
            @RequestParam String documentCategory,
            @RequestParam(defaultValue = "false") boolean replace,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return employeeDocumentService.uploadDocument(employeeId, file, documentCategory, replace, principal);
    }

    @GetMapping("/documents/{documentId}/download")
    public ResponseEntity<ByteArrayResource> downloadDocument(
            @PathVariable Long employeeId,
            @PathVariable Long documentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        EmployeeDocument document = employeeDocumentService.getDocument(employeeId, documentId, principal);
        return fileResponse(document, true);
    }

    @GetMapping("/documents/{documentId}/preview")
    public ResponseEntity<ByteArrayResource> previewDocument(
            @PathVariable Long employeeId,
            @PathVariable Long documentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        EmployeeDocument document = employeeDocumentService.getDocument(employeeId, documentId, principal);
        if (!employeeDocumentService.isPreviewSupported(document)) {
            throw new BadRequestException("Preview is not supported for this file type");
        }
        return fileResponse(document, false);
    }

    @DeleteMapping("/documents/{documentId}")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD')")
    public MessageResponse deleteDocument(
            @PathVariable Long employeeId,
            @PathVariable Long documentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        employeeDocumentService.deleteDocument(employeeId, documentId, principal);
        return new MessageResponse("Employee document deleted");
    }

    @PostMapping(value = "/profile-photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD')")
    public EmployeeDocumentResponse uploadProfilePhoto(
            @PathVariable Long employeeId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return employeeDocumentService.uploadProfilePhoto(employeeId, file, principal);
    }

    @GetMapping("/profile-photo")
    public ResponseEntity<ByteArrayResource> getProfilePhoto(
            @PathVariable Long employeeId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        EmployeeDocument document = employeeDocumentService.getProfilePhoto(employeeId, principal);
        return fileResponse(document, false);
    }

    @DeleteMapping("/profile-photo")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD')")
    public MessageResponse deleteProfilePhoto(
            @PathVariable Long employeeId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        employeeDocumentService.deleteProfilePhoto(employeeId, principal);
        return new MessageResponse("Employee profile photo deleted");
    }

    private ResponseEntity<ByteArrayResource> fileResponse(EmployeeDocument document, boolean attachment) {
        ContentDisposition disposition = attachment
                ? ContentDisposition.attachment().filename(document.getOriginalFileName()).build()
                : ContentDisposition.inline().filename(document.getOriginalFileName()).build();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(document.getFileType()))
                .contentLength(document.getFileSize())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(new ByteArrayResource(document.getFileData()));
    }
}
