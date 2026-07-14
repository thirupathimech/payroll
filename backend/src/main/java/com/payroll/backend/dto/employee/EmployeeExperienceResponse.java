package com.payroll.backend.dto.employee;

import java.time.LocalDate;

public record EmployeeExperienceResponse(
        Long id,
        String company,
        String designation,
        LocalDate startDate,
        LocalDate endDate,
        String totalExperience,
        String lastDrawnSalary,
        String reasonForLeaving
) {
}
