package com.payroll.backend.dto.reimbursement;

import com.payroll.backend.domain.enums.ReimbursementStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReimbursementDecisionRequest(
        @NotNull ReimbursementStatus status,
        @Size(max = 800) String reviewerComment
) { }
