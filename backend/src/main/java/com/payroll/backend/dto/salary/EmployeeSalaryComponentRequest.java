package com.payroll.backend.dto.salary;

import com.payroll.backend.domain.enums.SalaryValueType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record EmployeeSalaryComponentRequest(
        @NotNull Long componentId,
        @NotNull SalaryValueType valueType,
        @NotNull @DecimalMin(value = "0.0") @Digits(integer = 12, fraction = 2) BigDecimal value,
        boolean enabled
) {
}
