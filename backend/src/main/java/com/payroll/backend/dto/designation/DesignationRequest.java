package com.payroll.backend.dto.designation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DesignationRequest(
        @NotBlank @Size(max = 120) String title,
        @NotBlank @Size(max = 30) String code,
        @Size(max = 500) String description,
        @NotNull Long departmentId,
        Boolean active
) {
}
