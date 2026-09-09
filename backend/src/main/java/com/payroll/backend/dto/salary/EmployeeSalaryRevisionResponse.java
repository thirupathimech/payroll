package com.payroll.backend.dto.salary;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record EmployeeSalaryRevisionResponse(
        Long id,
        LocalDate effectiveDate,
        BigDecimal ctc,
        String reason,
        String createdBy,
        Instant createdAt,
        List<EmployeeSalaryComponentResponse> components
) {
}
