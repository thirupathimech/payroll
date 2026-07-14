package com.payroll.backend.dto.employee;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record EmployeeExperienceRequest(
        @Size(max = 160) String company,
        @Size(max = 160) String designation,
        LocalDate startDate,
        LocalDate endDate,
        @Size(max = 40) String totalExperience,
        @Size(max = 80) String lastDrawnSalary,
        @Size(max = 800) String reasonForLeaving
) {
}
