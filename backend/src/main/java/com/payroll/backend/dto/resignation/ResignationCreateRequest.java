package com.payroll.backend.dto.resignation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ResignationCreateRequest(
        Long employeeId,
        @NotNull LocalDate proposedLastWorkingDate,
        @NotBlank @Size(max = 800) String reason
) { }
