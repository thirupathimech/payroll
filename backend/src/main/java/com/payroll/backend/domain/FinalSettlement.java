package com.payroll.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
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
@Table(name = "final_settlements")
public class FinalSettlement extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_code", nullable = false, length = 3)
    private String orgCode;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resignation_request_id", nullable = false, unique = true)
    private ResignationRequest resignation;

    @Column(name = "leave_encashment_days", nullable = false, precision = 8, scale = 2)
    private BigDecimal leaveEncashmentDays = BigDecimal.ZERO;

    @Column(name = "leave_encashment_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal leaveEncashmentAmount = BigDecimal.ZERO;

    @Column(name = "notice_pay_recovery", nullable = false, precision = 14, scale = 2)
    private BigDecimal noticePayRecovery = BigDecimal.ZERO;

    @Column(name = "other_earnings", nullable = false, precision = 14, scale = 2)
    private BigDecimal otherEarnings = BigDecimal.ZERO;

    @Column(name = "other_deductions", nullable = false, precision = 14, scale = 2)
    private BigDecimal otherDeductions = BigDecimal.ZERO;

    @Column(length = 1200)
    private String remarks;

    @Column(nullable = false)
    private boolean settled;

    @Column(name = "settled_on")
    private LocalDate settledOn;

    @Column(name = "settled_by", length = 160)
    private String settledBy;

    @Column(name = "settled_at")
    private Instant settledAt;
}
