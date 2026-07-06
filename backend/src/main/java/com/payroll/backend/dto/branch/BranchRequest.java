package com.payroll.backend.dto.branch;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BranchRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 30) String code
) {
}
