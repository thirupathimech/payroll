package com.payroll.backend.dto.employee;

import java.time.Instant;

public record EmployeeDocumentResponse(
        Long id,
        Long employeeId,
        String fileName,
        String originalFileName,
        String fileType,
        String fileExtension,
        Long fileSize,
        String documentCategory,
        Instant uploadedAt,
        String uploadedBy,
        boolean profilePhoto,
        boolean previewSupported
) {
}
