package com.payroll.backend.service;

import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.EmployeeDocument;
import com.payroll.backend.dto.employee.EmployeeDocumentResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.EmployeeDocumentRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmployeeDocumentService {

    private static final long MAX_DOCUMENT_SIZE = 10L * 1024L * 1024L;
    private static final long MAX_PROFILE_PHOTO_SIZE = 3L * 1024L * 1024L;
    private static final Set<String> ALLOWED_DOCUMENT_TYPES = Set.of(
            MediaType.APPLICATION_PDF_VALUE,
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/octet-stream"
    );
    private static final Set<String> ALLOWED_PROFILE_TYPES = Set.of("image/jpeg", "image/jpg", "image/png", "image/webp");
    private static final Set<String> PREVIEW_TYPES = Set.of(
            MediaType.APPLICATION_PDF_VALUE,
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
    );

    private final EmployeeRepository employeeRepository;
    private final EmployeeDocumentRepository employeeDocumentRepository;
    private final AuditService auditService;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService employeeAccessService;

    @Transactional(readOnly = true)
    public List<EmployeeDocumentResponse> listDocuments(Long employeeId, UserPrincipal principal) {
        Employee employee = findEmployee(employeeId);
        employeeAccessService.assertCanAccessEmployee(principal, employee);
        return employeeDocumentRepository.findByOrgCodeAndEmployeeIdAndProfilePhotoFalseOrderByUploadedAtDesc(currentOrgService.orgCode(), employeeId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public EmployeeDocumentResponse uploadDocument(
            Long employeeId,
            MultipartFile file,
            String documentCategory,
            boolean replace,
            UserPrincipal principal
    ) {
        Employee employee = findEmployee(employeeId);
        employeeAccessService.assertCanAccessEmployee(principal, employee);
        validateFile(file, MAX_DOCUMENT_SIZE, ALLOWED_DOCUMENT_TYPES);
        String category = normalizeCategory(documentCategory);

        employeeDocumentRepository
                .findByOrgCodeAndEmployeeIdAndDocumentCategoryIgnoreCaseAndProfilePhotoFalse(currentOrgService.orgCode(), employeeId, category)
                .ifPresent(existing -> {
                    if (!replace) {
                        throw new BadRequestException("Document type already exists. Confirm replacement to upload a new version.");
                    }
                    employeeDocumentRepository.delete(existing);
                    employeeDocumentRepository.flush();
                });

        EmployeeDocument saved = employeeDocumentRepository.save(toDocument(employee, file, category, false, principal));
        auditService.log("EMPLOYEE_DOCUMENT_UPLOADED", "EmployeeDocument", saved.getId(), category);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public EmployeeDocument getDocument(Long employeeId, Long documentId, UserPrincipal principal) {
        Employee employee = findEmployee(employeeId);
        employeeAccessService.assertCanAccessEmployee(principal, employee);
        return employeeDocumentRepository.findByOrgCodeAndEmployeeIdAndId(currentOrgService.orgCode(), employeeId, documentId)
                .filter(document -> !document.isProfilePhoto())
                .orElseThrow(() -> new ResourceNotFoundException("Employee document not found"));
    }

    @Transactional
    public void deleteDocument(Long employeeId, Long documentId, UserPrincipal principal) {
        EmployeeDocument document = getDocument(employeeId, documentId, principal);
        employeeDocumentRepository.delete(document);
        auditService.log("EMPLOYEE_DOCUMENT_DELETED", "EmployeeDocument", document.getId(), document.getDocumentCategory());
    }

    @Transactional
    public EmployeeDocumentResponse uploadProfilePhoto(Long employeeId, MultipartFile file, UserPrincipal principal) {
        Employee employee = findEmployee(employeeId);
        employeeAccessService.assertCanAccessEmployee(principal, employee);
        validateFile(file, MAX_PROFILE_PHOTO_SIZE, ALLOWED_PROFILE_TYPES);
        employeeDocumentRepository.deleteByOrgCodeAndEmployeeAndProfilePhotoTrue(currentOrgService.orgCode(), employee);
        employeeDocumentRepository.flush();

        EmployeeDocument saved = employeeDocumentRepository.save(toDocument(employee, file, "PROFILE_PHOTO", true, principal));
        auditService.log("EMPLOYEE_PROFILE_PHOTO_UPLOADED", "EmployeeDocument", saved.getId(), employee.getEmployeeCode());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public EmployeeDocument getProfilePhoto(Long employeeId, UserPrincipal principal) {
        Employee employee = findEmployee(employeeId);
        employeeAccessService.assertCanAccessEmployee(principal, employee);
        return employeeDocumentRepository.findByOrgCodeAndEmployeeIdAndProfilePhotoTrue(currentOrgService.orgCode(), employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee profile photo not found"));
    }

    @Transactional
    public void deleteProfilePhoto(Long employeeId, UserPrincipal principal) {
        Employee employee = findEmployee(employeeId);
        employeeAccessService.assertCanAccessEmployee(principal, employee);
        employeeDocumentRepository.deleteByOrgCodeAndEmployeeAndProfilePhotoTrue(currentOrgService.orgCode(), employee);
        auditService.log("EMPLOYEE_PROFILE_PHOTO_DELETED", "Employee", employee.getId(), employee.getEmployeeCode());
    }

    @Transactional(readOnly = true)
    public boolean hasProfilePhoto(Long employeeId) {
        return employeeDocumentRepository.findByOrgCodeAndEmployeeIdAndProfilePhotoTrue(currentOrgService.orgCode(), employeeId).isPresent();
    }

    public boolean isPreviewSupported(EmployeeDocument document) {
        return PREVIEW_TYPES.contains(document.getFileType());
    }

    private EmployeeDocument toDocument(
            Employee employee,
            MultipartFile file,
            String documentCategory,
            boolean profilePhoto,
            UserPrincipal principal
    ) {
        try {
            String originalFileName = file.getOriginalFilename() == null ? "upload" : file.getOriginalFilename();
            String extension = extensionOf(originalFileName);
            String storedName = UUID.randomUUID() + (extension.isBlank() ? "" : "." + extension);

            EmployeeDocument document = new EmployeeDocument();
            document.setOrgCode(employee.getOrgCode());
            document.setEmployee(employee);
            document.setFileName(storedName);
            document.setOriginalFileName(originalFileName);
            document.setFileType(file.getContentType() == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : file.getContentType());
            document.setFileExtension(extension);
            document.setFileSize(file.getSize());
            document.setDocumentCategory(documentCategory);
            document.setUploadedAt(Instant.now());
            document.setUploadedBy(principal == null ? "system" : principal.email());
            document.setProfilePhoto(profilePhoto);
            document.setFileData(file.getBytes());
            return document;
        } catch (IOException ex) {
            throw new BadRequestException("Unable to read uploaded file");
        }
    }

    private void validateFile(MultipartFile file, long maxSize, Set<String> allowedTypes) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Uploaded file is required");
        }
        if (file.getSize() > maxSize) {
            throw new BadRequestException("Uploaded file exceeds the allowed size limit");
        }
        String contentType = file.getContentType();
        if (contentType == null || !allowedTypes.contains(contentType)) {
            throw new BadRequestException("Uploaded file type is not allowed");
        }
    }

    private String normalizeCategory(String documentCategory) {
        if (documentCategory == null || documentCategory.isBlank()) {
            throw new BadRequestException("Document category is required");
        }
        return documentCategory.trim();
    }

    private String extensionOf(String fileName) {
        int index = fileName.lastIndexOf('.');
        if (index < 0 || index == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(index + 1).toLowerCase(Locale.ROOT);
    }

    private Employee findEmployee(Long employeeId) {
        return employeeRepository.findByOrgCodeAndId(currentOrgService.orgCode(), employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
    }

    private EmployeeDocumentResponse toResponse(EmployeeDocument document) {
        return new EmployeeDocumentResponse(
                document.getId(),
                document.getEmployee().getId(),
                document.getFileName(),
                document.getOriginalFileName(),
                document.getFileType(),
                document.getFileExtension(),
                document.getFileSize(),
                document.getDocumentCategory(),
                document.getUploadedAt(),
                document.getUploadedBy(),
                document.isProfilePhoto(),
                isPreviewSupported(document)
        );
    }
}
