package com.payroll.backend.dto.leave;

import com.payroll.backend.domain.enums.LeaveType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record LeaveBalanceAllocationRequest(
        @NotNull LeaveType leaveType,
        @NotNull @Min(0) Integer allocatedMinutes,
        @NotNull @Min(0) Integer carriedForwardMinutes
) {
}
