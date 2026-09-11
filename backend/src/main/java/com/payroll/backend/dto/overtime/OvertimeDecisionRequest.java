package com.payroll.backend.dto.overtime;

import com.payroll.backend.domain.enums.OvertimeStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record OvertimeDecisionRequest(
        @NotNull OvertimeStatus status,
        @Size(max = 800) String reviewerComment
) {
}
