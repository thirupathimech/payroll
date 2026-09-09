package com.payroll.backend.dto.attendance;

import com.payroll.backend.domain.enums.MissingPunchType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public record MissingPunchCreateRequest(
        @NotNull LocalDate punchDate,
        @NotNull LocalTime punchTime,
        @NotNull MissingPunchType punchType,
        @NotBlank @Size(max = 800) String remark
) {
}
