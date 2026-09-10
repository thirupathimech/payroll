package com.payroll.backend.dto.exit;

import java.math.BigDecimal;
import java.time.Instant;

public record AssetCatalogItemResponse(
        Long id,
        String name,
        String category,
        boolean returnable,
        BigDecimal defaultRecoveryAmount,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) { }
