package com.payroll.backend.dto.salary;

import com.payroll.backend.domain.enums.SalaryComponentCategory;
import com.payroll.backend.domain.enums.SalaryValueType;

import java.math.BigDecimal;

/** A self-contained component value retained with a salary revision. */
public record SalaryRevisionComponentSnapshot(
        Long componentId,
        String name,
        String code,
        SalaryComponentCategory category,
        SalaryValueType valueType,
        BigDecimal value,
        boolean enabled
) {
}
