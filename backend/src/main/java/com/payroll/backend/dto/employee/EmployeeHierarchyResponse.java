package com.payroll.backend.dto.employee;

import java.util.List;

public record EmployeeHierarchyResponse(
        EmployeeHierarchyNodeResponse current,
        List<EmployeeHierarchyNodeResponse> ancestors,
        List<EmployeeHierarchyNodeResponse> descendants
) {
}
