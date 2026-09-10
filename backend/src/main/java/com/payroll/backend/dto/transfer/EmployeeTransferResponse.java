package com.payroll.backend.dto.transfer;

import com.payroll.backend.domain.enums.EmployeeTransferStatus;

import java.time.Instant;
import java.time.LocalDate;

public record EmployeeTransferResponse(
        Long id,
        Long employeeId,
        String employeeCode,
        String employeeName,
        Long fromBranchId,
        String fromBranchName,
        Long toBranchId,
        String toBranchName,
        LocalDate effectiveDate,
        String reason,
        EmployeeTransferStatus status,
        String requestedByEmail,
        String reviewerEmail,
        String reviewerComment,
        Instant reviewedAt,
        Instant appliedAt,
        Instant createdAt,
        Instant updatedAt
) { }
