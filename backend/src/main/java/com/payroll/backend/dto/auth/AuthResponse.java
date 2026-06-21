package com.payroll.backend.dto.auth;

public record AuthResponse(
        String token,
        String tokenType,
        long expiresIn,
        UserSummary user
) {
}
