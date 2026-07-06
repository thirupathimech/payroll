package com.payroll.backend.dto.employee;

import com.payroll.backend.domain.enums.EmploymentStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EmployeeRequest(
        @Size(max = 40) String employeeCode,
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @Email @NotBlank @Size(max = 160) String email,
        @Size(max = 40) String phone,
        LocalDate dateOfBirth,
        @NotNull LocalDate joiningDate,
        @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal baseSalary,
        @Size(max = 80) String bankAccountNumber,
        @Size(max = 80) String taxIdentificationNumber,
        @Size(max = 600) String address,
        Long branchId,
        @NotNull EmploymentStatus status,
        @NotNull Long departmentId,
        @NotNull Long designationId
) {
}
