package com.payroll.backend.dto.overtime;

import com.payroll.backend.domain.enums.OvertimePayRateType;
import java.math.BigDecimal;

public record OvertimeEligibilityResponse(boolean eligible, OvertimePayRateType payRateType, BigDecimal payRateValue) {
}
