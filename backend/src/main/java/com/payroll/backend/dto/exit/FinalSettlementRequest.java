package com.payroll.backend.dto.exit;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FinalSettlementRequest(
        @NotNull @DecimalMin("0.00") BigDecimal leaveEncashmentDays,
        @NotNull @DecimalMin("0.00") BigDecimal leaveEncashmentAmount,
        @NotNull @DecimalMin("0.00") BigDecimal noticePayRecovery,
        @NotNull @DecimalMin("0.00") BigDecimal otherEarnings,
        @NotNull @DecimalMin("0.00") BigDecimal otherDeductions,
        @Size(max = 1200) String remarks,
        boolean settled,
        LocalDate settledOn
) { }
