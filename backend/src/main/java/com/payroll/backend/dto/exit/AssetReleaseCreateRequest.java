package com.payroll.backend.dto.exit;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record AssetReleaseCreateRequest(
        @NotNull Long assetCatalogItemId,
        @NotNull LocalDate releasedOn,
        @Size(max = 800) String conditionNote
) { }
