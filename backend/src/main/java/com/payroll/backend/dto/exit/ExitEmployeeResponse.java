package com.payroll.backend.dto.exit;

import java.time.LocalDate;

public record ExitEmployeeResponse(
        Long id,
        String employeeCode,
        String fullName,
        String email,
        LocalDate joiningDate,
        String branchName,
        String departmentName,
        String designationTitle
) { }
