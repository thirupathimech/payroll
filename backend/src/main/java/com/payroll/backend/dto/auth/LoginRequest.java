package com.payroll.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank String orgCode,
        @NotBlank String email,
        @NotBlank String password
) {
}
