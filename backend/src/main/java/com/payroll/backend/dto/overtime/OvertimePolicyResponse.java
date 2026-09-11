package com.payroll.backend.dto.overtime;

import com.payroll.backend.domain.enums.OvertimePayRateType;
import java.math.BigDecimal;
import java.time.Instant;

public record OvertimePolicyResponse(
        Long id,
        Long branchId,
        String branchName,
        Long departmentId,
        String departmentName,
        Long designationId,
        String designationTitle,
        OvertimePayRateType payRateType,
        BigDecimal payRateValue,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
