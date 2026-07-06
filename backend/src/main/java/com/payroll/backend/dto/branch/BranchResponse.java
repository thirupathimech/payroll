package com.payroll.backend.dto.branch;

import java.time.Instant;

public record BranchResponse(
        Long id,
        String name,
        String code,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
