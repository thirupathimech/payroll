package com.payroll.backend.dto.salary;

import java.math.BigDecimal;
import java.util.List;

public record EmployeeSalaryResponse(
        Long employeeId,
        String employeeCode,
        String employeeName,
        String branchName,
        String departmentName,
        String designationTitle,
        BigDecimal ctc,
        List<EmployeeSalaryComponentResponse> components
) {
}
