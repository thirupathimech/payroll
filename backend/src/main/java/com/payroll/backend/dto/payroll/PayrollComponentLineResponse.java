package com.payroll.backend.dto.payroll;

import com.payroll.backend.domain.enums.SalaryComponentCategory;

import java.math.BigDecimal;

public record PayrollComponentLineResponse(
        String name,
        String code,
        SalaryComponentCategory category,
        BigDecimal amount
) {
}
