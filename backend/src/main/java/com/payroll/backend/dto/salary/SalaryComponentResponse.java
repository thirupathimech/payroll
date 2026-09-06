package com.payroll.backend.dto.salary;

import com.payroll.backend.domain.enums.SalaryComponentCategory;
import com.payroll.backend.domain.enums.SalaryValueType;

import java.math.BigDecimal;
import java.time.Instant;

public record SalaryComponentResponse(
        Long id,
        String name,
        String code,
        SalaryComponentCategory category,
        SalaryValueType valueType,
        BigDecimal defaultValue,
        boolean enabled,
        Instant createdAt,
        Instant updatedAt
) {
}
