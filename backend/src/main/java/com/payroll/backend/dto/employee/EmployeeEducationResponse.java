package com.payroll.backend.dto.employee;

public record EmployeeEducationResponse(
        Long id,
        String qualification,
        String institution,
        String university,
        String yearOfPassing,
        String score,
        String specialization
) {
}
