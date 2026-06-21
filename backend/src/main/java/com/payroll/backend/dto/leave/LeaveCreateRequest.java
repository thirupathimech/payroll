package com.payroll.backend.dto.leave;

import com.payroll.backend.domain.enums.LeaveType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record LeaveCreateRequest(
        @NotNull Long employeeId,
        @NotNull LeaveType leaveType,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @NotBlank @Size(max = 800) String reason
) {
}
