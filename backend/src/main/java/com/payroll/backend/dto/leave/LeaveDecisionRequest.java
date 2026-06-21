package com.payroll.backend.dto.leave;

import com.payroll.backend.domain.enums.LeaveStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record LeaveDecisionRequest(
        @NotNull LeaveStatus status,
        @Size(max = 800) String reviewerComment
) {
}
