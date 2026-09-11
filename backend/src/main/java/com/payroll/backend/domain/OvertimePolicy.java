package com.payroll.backend.domain;

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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "overtime_policies", uniqueConstraints = @UniqueConstraint(
        name = "uk_overtime_policy_scope", columnNames = {"org_code", "branch_id", "department_id", "designation_id"}
))
public class OvertimePolicy extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_code", nullable = false, length = 3)
    private String orgCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "designation_id", nullable = false)
    private Designation designation;

    @Enumerated(EnumType.STRING)
    @Column(name = "pay_rate_type", nullable = false, length = 40)
    private OvertimePayRateType payRateType = OvertimePayRateType.FIXED_HOURLY_AMOUNT;

    /** Fixed hourly amount or the multiplier applied to the employee's hourly salary. */
    @Column(name = "hourly_rate", nullable = false, precision = 14, scale = 2)
    private BigDecimal payRateValue;

    @Column(nullable = false)
    private boolean active = true;
}
