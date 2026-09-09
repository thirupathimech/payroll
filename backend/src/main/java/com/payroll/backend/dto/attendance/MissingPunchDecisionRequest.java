package com.payroll.backend.dto.attendance;

import com.payroll.backend.domain.enums.MissingPunchStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record MissingPunchDecisionRequest(
        @NotNull MissingPunchStatus status,
        @Size(max = 800) String reviewerComment
) {
}
