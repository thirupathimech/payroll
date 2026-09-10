package com.payroll.backend.repository;

import com.payroll.backend.domain.PayrollRun;
import com.payroll.backend.domain.enums.PayrollRunStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PayrollRunRepository extends JpaRepository<PayrollRun, Long> {
    List<PayrollRun> findByOrgCodeOrderByPeriodStartDesc(String orgCode);
    Optional<PayrollRun> findByOrgCodeAndId(String orgCode, Long id);
    boolean existsByOrgCodeAndPeriodStartAndPeriodEnd(String orgCode, LocalDate periodStart, LocalDate periodEnd);
    boolean existsByOrgCodeAndPeriodStartLessThanEqualAndPeriodEndGreaterThanEqual(
            String orgCode,
            LocalDate periodEnd,
            LocalDate periodStart
    );
    boolean existsByOrgCodeAndStatusAndPeriodStartLessThanEqualAndPeriodEndGreaterThanEqual(
            String orgCode,
            PayrollRunStatus status,
            LocalDate periodEnd,
            LocalDate periodStart
    );
}
