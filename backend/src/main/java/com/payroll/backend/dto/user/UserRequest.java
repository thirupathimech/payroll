package com.payroll.backend.dto.user;

import com.payroll.backend.domain.enums.RoleName;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UserRequest(
        @NotBlank @Size(max = 80) String username,
        @NotBlank @Size(max = 40) String employeeCode,
        @NotNull RoleName role,
        Boolean enabled
) {
}
