package com.payroll.backend.dto.payroll;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record PayrollEntryResponse(
        Long id,
        Long payrollRunId,
        Integer periodYear,
        Integer periodMonth,
        String employeeCode,
        String employeeName,
        String departmentName,
        String designationTitle,
        String bankAccountNumber,
        BigDecimal annualCtc,
        Integer periodDays,
        BigDecimal eligibleDays,
        BigDecimal workingDays,
        BigDecimal attendanceDays,
        BigDecimal paidLeaveDays,
        BigDecimal unpaidLeaveDays,
        BigDecimal payableDays,
        BigDecimal grossEarnings,
        BigDecimal totalDeductions,
        BigDecimal employerContributions,
        BigDecimal netPay,
        List<PayrollComponentLineResponse> componentLines,
        Instant createdAt
) {
}
