package com.payroll.backend.dto.report;

import java.time.LocalDate;

/**
 * One calendar-off day for one employee. The report intentionally resolves
 * scoped rules to employee/date rows so it can be used for attendance review.
 */
public record CalendarOffReportRow(
        LocalDate date,
        String day,
        Long employeeId,
        String employeeCode,
        String employeeName,
        Long branchId,
        String branchName,
        Long departmentId,
        String departmentName,
        Long designationId,
        String designationTitle,
        String calendarOff,
        String appliedVia
) {
}
