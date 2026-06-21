package com.payroll.backend.dto.designation;

import java.time.Instant;

public record DesignationResponse(
        Long id,
        String title,
        String code,
        String description,
        Long departmentId,
        String departmentName,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
