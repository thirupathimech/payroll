package com.payroll.backend.dto.employee;

import com.payroll.backend.domain.enums.EmploymentStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.time.LocalDate;

public record EmployeeRequest(
        @Size(max = 40) String employeeCode,
        @NotBlank @Size(max = 100) String firstName,
        @Size(max = 100) String middleName,
        @NotBlank @Size(max = 100) String lastName,
        @Email @NotBlank @Size(max = 160) String email,
        @Email @Size(max = 160) String personalEmail,
        @Size(max = 40) String phone,
        @Size(max = 40) String alternateMobileNumber,
        @Size(max = 40) String gender,
        @Size(max = 40) String maritalStatus,
        @Size(max = 10) String bloodGroup,
        @Size(max = 80) String nationality,
        @Size(max = 20) String aadhaarNumber,
        LocalDate dateOfBirth,
        @NotNull LocalDate joiningDate,
        LocalDate confirmationDate,
        @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal baseSalary,
        @Size(max = 40) String employmentType,
        @Size(max = 80) String probationPeriod,
        @Size(max = 80) String biometricId,
        @Size(max = 80) String bankAccountNumber,
        @Size(max = 160) String accountHolderName,
        @Size(max = 160) String bankName,
        @Size(max = 40) String ifscCode,
        @Size(max = 80) String taxIdentificationNumber,
        @Size(max = 600) String address,
        @Size(max = 600) String permanentAddress,
        @Size(max = 160) String emergencyContactName,
        @Size(max = 80) String emergencyRelationship,
        @Size(max = 40) String emergencyMobileNumber,
        @Size(max = 120) String primarySkill,
        @Size(max = 120) String secondarySkill,
        @Size(max = 800) String certifications,
        @Size(max = 300) String languagesKnown,
        LocalDate resignationDate,
        LocalDate lastWorkingDate,
        @Size(max = 800) String exitReason,
        LocalDate relievingDate,
        Long branchId,
        Long managerId,
        Long hrManagerId,
        List<EmployeeEducationRequest> education,
        List<EmployeeExperienceRequest> experience,
        @NotNull EmploymentStatus status,
        @NotNull Long departmentId,
        @NotNull Long designationId
) {
}
