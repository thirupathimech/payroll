package com.payroll.backend.domain;

import com.payroll.backend.domain.enums.OvertimeStatus;
import com.payroll.backend.domain.enums.OvertimePayRateType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "overtime_requests")
public class OvertimeRequest extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_code", nullable = false, length = 3)
    private String orgCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "overtime_date", nullable = false)
    private LocalDate overtimeDate;

    @Column(name = "requested_minutes", nullable = false)
    private Integer requestedMinutes;

    @Column(name = "approved_minutes")
    private Integer approvedMinutes;

    @Column(name = "approved_hourly_rate", precision = 14, scale = 2)
    private BigDecimal approvedHourlyRate;

    @Enumerated(EnumType.STRING)
    @Column(name = "approved_pay_rate_type", length = 40)
    private OvertimePayRateType approvedPayRateType;

    @Column(name = "approved_pay_rate_value", precision = 14, scale = 2)
    private BigDecimal approvedPayRateValue;

    @Column(length = 800)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private OvertimeStatus status = OvertimeStatus.PENDING;

    @Column(length = 800)
    private String reviewerComment;

    private Instant reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by_id", nullable = false)
    private AppUser requestedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private AppUser reviewedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payroll_run_id")
    private PayrollRun payrollRun;

    private Instant paidAt;
}
