package com.payroll.backend.dto.employee;

import com.payroll.backend.domain.enums.EmploymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record EmployeeResponse(
        Long id,
        String employeeCode,
        String firstName,
        String lastName,
        String fullName,
        String email,
        String phone,
        LocalDate dateOfBirth,
        LocalDate joiningDate,
        BigDecimal baseSalary,
        String bankAccountNumber,
        String taxIdentificationNumber,
        String address,
        EmploymentStatus status,
        Long departmentId,
        String departmentName,
        Long designationId,
        String designationTitle,
        boolean hasProfilePhoto,
        Instant createdAt,
        Instant updatedAt
) {
}
