package com.payroll.backend.dto.holiday;

import java.time.Instant;
import java.time.LocalDate;

public record HolidayResponse(
        Long id, Long branchId, String branchName, Long departmentId, String departmentName,
        Long designationId, String designationTitle, LocalDate date, String title,
        Instant createdAt, Instant updatedAt
) {}
