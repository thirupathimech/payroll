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

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "payroll_entries", uniqueConstraints = @UniqueConstraint(
        name = "uk_payroll_entry_run_employee", columnNames = {"payroll_run_id", "employee_id"}
))
public class PayrollEntry extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_code", nullable = false, length = 3)
    private String orgCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payroll_run_id", nullable = false)
    private PayrollRun payrollRun;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "employee_code", nullable = false, length = 40)
    private String employeeCode;

    @Column(name = "employee_name", nullable = false, length = 220)
    private String employeeName;

    @Column(name = "department_name", length = 120)
    private String departmentName;

    @Column(name = "designation_title", length = 120)
    private String designationTitle;

    @Column(name = "bank_account_number", length = 80)
    private String bankAccountNumber;

    @Column(name = "annual_ctc", nullable = false, precision = 14, scale = 2)
    private BigDecimal annualCtc = BigDecimal.ZERO;

    @Column(name = "period_days", nullable = false)
    private Integer periodDays;

    @Column(name = "eligible_days", nullable = false, precision = 8, scale = 2)
    private BigDecimal eligibleDays = BigDecimal.ZERO;

    @Column(name = "working_days", nullable = false, precision = 8, scale = 2)
    private BigDecimal workingDays = BigDecimal.ZERO;

    @Column(name = "attendance_days", nullable = false, precision = 8, scale = 2)
    private BigDecimal attendanceDays = BigDecimal.ZERO;

    @Column(name = "paid_leave_days", nullable = false, precision = 8, scale = 2)
    private BigDecimal paidLeaveDays = BigDecimal.ZERO;

    @Column(name = "unpaid_leave_days", nullable = false, precision = 8, scale = 2)
    private BigDecimal unpaidLeaveDays = BigDecimal.ZERO;

    @Column(name = "payable_days", nullable = false, precision = 8, scale = 2)
    private BigDecimal payableDays = BigDecimal.ZERO;

    @Column(name = "gross_earnings", nullable = false, precision = 14, scale = 2)
    private BigDecimal grossEarnings = BigDecimal.ZERO;

    @Column(name = "total_deductions", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalDeductions = BigDecimal.ZERO;

    @Column(name = "employer_contributions", nullable = false, precision = 14, scale = 2)
    private BigDecimal employerContributions = BigDecimal.ZERO;

    /** Tax-neutral approved business expenses paid along with this payroll. */
    @Column(name = "reimbursement_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal reimbursementAmount = BigDecimal.ZERO;

    @Column(name = "net_pay", nullable = false, precision = 14, scale = 2)
    private BigDecimal netPay = BigDecimal.ZERO;

    @Column(name = "component_lines_json", nullable = false, columnDefinition = "json")
    private String componentLinesJson;
}
