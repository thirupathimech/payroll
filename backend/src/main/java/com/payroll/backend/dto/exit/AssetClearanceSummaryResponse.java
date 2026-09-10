package com.payroll.backend.dto.exit;

import java.math.BigDecimal;
import java.time.Instant;

public record AssetClearanceSummaryResponse(
        int totalAssets,
        int returnedAssets,
        int pendingAssets,
        int recoveredAssets,
        BigDecimal assetRecoveryAmount,
        boolean readyToComplete,
        boolean completed,
        Instant completedAt,
        String completedBy
) { }
