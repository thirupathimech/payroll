package com.payroll.backend.dto.employee;

import com.payroll.backend.domain.EmployeeCodeMode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EmployeeSettingsRequest(
        @NotNull EmployeeCodeMode codeMode,
        @NotBlank @Size(max = 30) String prefix,
        @Size(max = 30) String suffix,
        @NotNull @Min(0) Integer startingNumber,
        @NotNull @Min(1) @Max(12) Integer padding
) {
}
