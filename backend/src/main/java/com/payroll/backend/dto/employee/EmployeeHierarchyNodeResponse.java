package com.payroll.backend.dto.employee;

import java.util.List;

public record EmployeeHierarchyNodeResponse(
        Long id,
        String employeeCode,
        String fullName,
        String designationTitle,
        String departmentName,
        String branchName,
        Long managerId,
        String managerEmployeeCode,
        String managerName,
        int directReportsCount,
        boolean hasProfilePhoto,
        List<EmployeeHierarchyNodeResponse> children
) {
}
