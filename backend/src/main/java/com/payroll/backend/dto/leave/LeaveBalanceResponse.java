package com.payroll.backend.dto.leave;

import com.payroll.backend.domain.enums.LeaveType;

public record LeaveBalanceResponse(
        Long employeeId,
        String employeeCode,
        String employeeName,
        int year,
        LeaveType leaveType,
        int allocatedMinutes,
        int carriedForwardMinutes,
        int creditedMinutes,
        int approvedMinutes,
        int pendingMinutes,
        int availableMinutes
) {
}
