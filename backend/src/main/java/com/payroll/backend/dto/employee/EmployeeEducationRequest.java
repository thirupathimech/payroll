package com.payroll.backend.dto.employee;

import jakarta.validation.constraints.Size;

public record EmployeeEducationRequest(
        @Size(max = 160) String qualification,
        @Size(max = 160) String institution,
        @Size(max = 160) String university,
        @Size(max = 40) String yearOfPassing,
        @Size(max = 40) String score,
        @Size(max = 160) String specialization
) {
}
