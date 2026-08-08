package com.payroll.backend.dto.dashboard;

import com.payroll.backend.dto.leave.LeaveResponse;

import java.util.List;

public record DashboardSummaryResponse(
        long totalEmployees,
        long activeEmployees,
        long presentEmployees,
        long activeDepartments,
        long pendingLeaves,
        long approvedLeavesThisMonth,
        List<LeaveResponse> recentLeaves
) {
}
