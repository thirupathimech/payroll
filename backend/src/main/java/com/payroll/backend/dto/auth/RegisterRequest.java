package com.payroll.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(max = 180) String companyName,
        @NotBlank @Size(max = 160) String fullName,
        @Email @NotBlank @Size(max = 160) String email,
        @NotBlank @Size(min = 8, max = 80) String password
) {
}
