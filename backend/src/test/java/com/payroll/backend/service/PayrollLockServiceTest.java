package com.payroll.backend.service;

import com.payroll.backend.domain.enums.PayrollRunStatus;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.repository.PayrollRunRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PayrollLockServiceTest {

    @Test
    void rejectsAnyChangeThatOverlapsALockedPayrollPeriod() {
        PayrollRunRepository repository = mock(PayrollRunRepository.class);
        CurrentOrgService currentOrgService = mock(CurrentOrgService.class);
        when(currentOrgService.orgCode()).thenReturn("ORG");
        when(repository.existsByOrgCodeAndStatusAndPeriodStartLessThanEqualAndPeriodEndGreaterThanEqual(
                "ORG", PayrollRunStatus.LOCKED, LocalDate.of(2026, 9, 15), LocalDate.of(2026, 9, 12)
        )).thenReturn(true);

        PayrollLockService service = new PayrollLockService(repository, currentOrgService);

        assertThatThrownBy(() -> service.assertUnlocked(LocalDate.of(2026, 9, 12), LocalDate.of(2026, 9, 15)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Payroll is locked");
    }
}
