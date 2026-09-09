package com.payroll.backend.domain;

import com.payroll.backend.domain.enums.LeaveType;
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

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "employee_leave_entitlements",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_leave_entitlement_employee_type_year",
                columnNames = {"org_code", "employee_id", "leave_type", "leave_year"}
        )
)
public class EmployeeLeaveEntitlement extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_code", nullable = false, length = 3)
    private String orgCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(name = "leave_type", nullable = false, length = 40)
    private LeaveType leaveType;

    @Column(name = "leave_year", nullable = false)
    private Integer leaveYear;

    @Column(name = "allocated_minutes", nullable = false)
    private Integer allocatedMinutes = 0;

    @Column(name = "carried_forward_minutes", nullable = false)
    private Integer carriedForwardMinutes = 0;
}
