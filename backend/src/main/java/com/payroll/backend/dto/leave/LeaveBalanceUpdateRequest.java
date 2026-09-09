package com.payroll.backend.dto.leave;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record LeaveBalanceUpdateRequest(
        @NotNull @Min(2000) @Max(2100) Integer year,
        @NotEmpty List<@Valid LeaveBalanceAllocationRequest> balances
) {
}
