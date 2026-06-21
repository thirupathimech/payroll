package com.payroll.backend.dto.department;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DepartmentRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 30) String code,
        @Size(max = 500) String description,
        Boolean active
) {
}
