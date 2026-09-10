package com.payroll.backend.dto.reimbursement;

import java.time.Instant;

public record ReimbursementAttachmentResponse(
        Long id,
        String originalFileName,
        String fileType,
        String fileExtension,
        long fileSize,
        String uploadedBy,
        Instant uploadedAt,
        boolean previewSupported
) { }
