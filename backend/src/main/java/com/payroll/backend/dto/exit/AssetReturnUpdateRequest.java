package com.payroll.backend.dto.exit;

import com.payroll.backend.domain.enums.AssetReturnStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AssetReturnUpdateRequest(
        @NotNull AssetReturnStatus returnStatus,
        LocalDate returnedOn,
        @NotNull @DecimalMin("0.00") BigDecimal recoveryAmount,
        @Size(max = 800) String conditionNote
) { }
