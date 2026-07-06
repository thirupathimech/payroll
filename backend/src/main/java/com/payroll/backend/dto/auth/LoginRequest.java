package com.payroll.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank String orgCode,
        @Email @NotBlank String email,
        @NotBlank String password
) {
}
