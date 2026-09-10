package com.payroll.backend.dto.exit;

import com.payroll.backend.domain.enums.AssetReturnStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record AssetReleaseResponse(
        Long id,
        Long catalogItemId,
        String assetName,
        String assetCategory,
        boolean returnable,
        LocalDate releasedOn,
        AssetReturnStatus returnStatus,
        LocalDate returnedOn,
        BigDecimal recoveryAmount,
        String conditionNote,
        String verifiedBy,
        Instant verifiedAt,
        Instant createdAt,
        Instant updatedAt
) { }
