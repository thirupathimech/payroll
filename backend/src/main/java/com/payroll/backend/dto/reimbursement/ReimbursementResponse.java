package com.payroll.backend.dto.reimbursement;

import com.payroll.backend.domain.enums.ReimbursementStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record ReimbursementResponse(
        Long id,
        Long employeeId,
        String employeeCode,
        String employeeName,
        LocalDate expenseDate,
        String category,
        BigDecimal amount,
        String description,
        ReimbursementStatus status,
        String requestedByEmail,
        String reviewerEmail,
        String reviewerComment,
        Instant reviewedAt,
        Long payrollRunId,
        Instant paidAt,
        List<ReimbursementAttachmentResponse> attachments,
        Instant createdAt,
        Instant updatedAt
) { }
