package com.payroll.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
import java.time.LocalDate;

/**
 * An immutable compensation snapshot. The component JSON stores component
 * attributes and values so catalog changes cannot rewrite salary history.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "employee_salary_revisions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_salary_revision_employee_effective", columnNames = {"org_code", "employee_id", "effective_date"})
})
public class EmployeeSalaryRevision extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_code", nullable = false, length = 3)
    private String orgCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Column(name = "annual_ctc", nullable = false, precision = 14, scale = 2)
    private BigDecimal annualCtc;

    @Column(length = 600)
    private String reason;

    @Column(name = "created_by", nullable = false, length = 160)
    private String createdBy;

    @Column(name = "components_json", nullable = false, columnDefinition = "json")
    private String componentsJson;
}
