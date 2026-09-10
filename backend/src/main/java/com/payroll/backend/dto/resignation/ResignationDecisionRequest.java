package com.payroll.backend.dto.resignation;

import com.payroll.backend.domain.enums.ResignationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ResignationDecisionRequest(
        @NotNull ResignationStatus status,
        LocalDate approvedLastWorkingDate,
        LocalDate relievingDate,
        @Size(max = 800) String reviewerComment
) { }
