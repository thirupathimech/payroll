package com.payroll.backend.dto.payroll;

import com.payroll.backend.domain.enums.PayrollRunStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record PayrollRunResponse(
        Long id,
        Integer periodYear,
        Integer periodMonth,
        LocalDate periodStart,
        LocalDate periodEnd,
        String payrollFrequency,
        LocalDate disbursementDate,
        PayrollRunStatus status,
        Integer employeeCount,
        BigDecimal grossEarnings,
        BigDecimal totalDeductions,
        BigDecimal employerContributions,
        BigDecimal netPay,
        String approvedBy,
        Instant approvedAt,
        String lockedBy,
        Instant lockedAt,
        Instant createdAt,
        Instant updatedAt,
        List<PayrollEntryResponse> entries
) {
}
