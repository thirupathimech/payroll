package com.payroll.backend.dto.exit;

import java.math.BigDecimal;

public record ExitFinancialSummaryResponse(
        BigDecimal finalPayslipNetPay,
        BigDecimal leaveEncashmentAmount,
        BigDecimal otherEarnings,
        BigDecimal totalCredits,
        BigDecimal noticePayRecovery,
        BigDecimal assetRecoveryAmount,
        BigDecimal otherDeductions,
        BigDecimal totalDeductions,
        BigDecimal netSettlementPayable
) { }
