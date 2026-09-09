package com.payroll.backend.domain;

import com.payroll.backend.domain.enums.PayrollRunStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "payroll_runs", uniqueConstraints = @UniqueConstraint(
        name = "uk_payroll_run_org_dates", columnNames = {"org_code", "period_start", "period_end"}
))
public class PayrollRun extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_code", nullable = false, length = 3)
    private String orgCode;

    @Column(name = "period_year", nullable = false)
    private Integer periodYear;

    @Column(name = "period_month", nullable = false)
    private Integer periodMonth;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    /** Frequency at generation time, retained with the historical payroll snapshot. */
    @Column(name = "payroll_frequency", nullable = false, length = 20)
    private String payrollFrequency = "MONTHLY";

    @Column(name = "disbursement_date")
    private LocalDate disbursementDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PayrollRunStatus status = PayrollRunStatus.DRAFT;

    @Column(name = "employee_count", nullable = false)
    private Integer employeeCount = 0;

    @Column(name = "gross_earnings", nullable = false, precision = 14, scale = 2)
    private BigDecimal grossEarnings = BigDecimal.ZERO;

    @Column(name = "total_deductions", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalDeductions = BigDecimal.ZERO;

    @Column(name = "employer_contributions", nullable = false, precision = 14, scale = 2)
    private BigDecimal employerContributions = BigDecimal.ZERO;

    @Column(name = "net_pay", nullable = false, precision = 14, scale = 2)
    private BigDecimal netPay = BigDecimal.ZERO;

    @Column(name = "approved_by", length = 160)
    private String approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "locked_by", length = 160)
    private String lockedBy;

    @Column(name = "locked_at")
    private Instant lockedAt;
}
