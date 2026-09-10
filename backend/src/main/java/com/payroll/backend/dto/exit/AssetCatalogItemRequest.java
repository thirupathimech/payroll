package com.payroll.backend.dto.exit;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record AssetCatalogItemRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 80) String category,
        boolean returnable,
        @NotNull @DecimalMin("0.00") BigDecimal defaultRecoveryAmount,
        boolean active
) { }
