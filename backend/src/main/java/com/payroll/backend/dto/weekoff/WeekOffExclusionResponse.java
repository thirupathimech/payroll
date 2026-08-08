package com.payroll.backend.dto.weekoff;
import java.time.Instant;
import java.time.LocalDate;
public record WeekOffExclusionResponse(Long id, Long branchId, String branchName, Long departmentId, String departmentName, Long designationId, String designationTitle, LocalDate date, Instant createdAt, Instant updatedAt) {}
