package com.payroll.backend.dto.exit;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record FinalSettlementResponse(
        Long id,
        BigDecimal leaveEncashmentDays,
        BigDecimal leaveEncashmentAmount,
        BigDecimal noticePayRecovery,
        BigDecimal otherEarnings,
        BigDecimal otherDeductions,
        String remarks,
        boolean settled,
        LocalDate settledOn,
        String settledBy,
        Instant settledAt,
        Instant updatedAt
) { }
