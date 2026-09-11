package com.payroll.backend.dto.overtime;

import com.payroll.backend.domain.enums.OvertimePayRateType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record OvertimePolicyRequest(
        @NotNull Long branchId,
        @NotNull Long departmentId,
        @NotNull Long designationId,
        @NotNull OvertimePayRateType payRateType,
        @NotNull @DecimalMin(value = "0.01") BigDecimal payRateValue
) {
}
