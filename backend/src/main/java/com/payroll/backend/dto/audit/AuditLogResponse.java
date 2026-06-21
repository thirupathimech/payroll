package com.payroll.backend.dto.audit;

import java.time.Instant;

public record AuditLogResponse(
        Long id,
        String actorEmail,
        String action,
        String entityName,
        String entityId,
        String details,
        Instant createdAt
) {
}
