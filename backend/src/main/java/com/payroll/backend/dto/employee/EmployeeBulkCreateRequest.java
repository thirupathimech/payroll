package com.payroll.backend.dto.employee;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record EmployeeBulkCreateRequest(
        @NotEmpty(message = "Add at least one employee")
        @Size(max = 500, message = "A maximum of 500 employees can be uploaded at once")
        List<@Valid EmployeeRequest> employees
) {
}
