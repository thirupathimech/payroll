package com.payroll.backend.dto.resignation;

import com.payroll.backend.domain.enums.ResignationStatus;

import java.time.Instant;
import java.time.LocalDate;

public record ResignationResponse(
        Long id,
        Long employeeId,
        String employeeCode,
        String employeeName,
        LocalDate resignationDate,
        LocalDate proposedLastWorkingDate,
        LocalDate approvedLastWorkingDate,
        LocalDate relievingDate,
        String reason,
        ResignationStatus status,
        String requestedByEmail,
        String reviewerEmail,
        String reviewerComment,
        Instant reviewedAt,
        Instant separatedAt,
        Instant assetClearanceCompletedAt,
        String assetClearanceCompletedBy,
        Instant createdAt,
        Instant updatedAt
) { }
