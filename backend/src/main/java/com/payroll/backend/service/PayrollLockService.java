package com.payroll.backend.service;

import com.payroll.backend.domain.enums.PayrollRunStatus;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.repository.PayrollRunRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

/**
 * Prevents a later attendance, leave, or calendar edit from changing a date
 * that already belongs to a locked payroll snapshot.
 */
@Service
@RequiredArgsConstructor
public class PayrollLockService {

    private final PayrollRunRepository payrollRunRepository;
    private final CurrentOrgService currentOrgService;

    public void assertUnlocked(LocalDate date) {
        assertUnlocked(date, date);
    }

    public void assertUnlocked(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            return;
        }
        LocalDate start = startDate.isBefore(endDate) ? startDate : endDate;
        LocalDate end = startDate.isBefore(endDate) ? endDate : startDate;
        if (payrollRunRepository.existsByOrgCodeAndStatusAndPeriodStartLessThanEqualAndPeriodEndGreaterThanEqual(
                currentOrgService.orgCode(), PayrollRunStatus.LOCKED, end, start
        )) {
            throw new BadRequestException(
                    "Payroll is locked for the selected date range. Payroll-related changes are not allowed."
            );
        }
    }
}
