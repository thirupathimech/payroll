package com.payroll.backend.dto.transfer;

import com.payroll.backend.domain.enums.EmployeeTransferStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EmployeeTransferDecisionRequest(
        @NotNull EmployeeTransferStatus status,
        @Size(max = 800) String reviewerComment
) { }
