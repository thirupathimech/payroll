package com.payroll.backend.domain;

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

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "employee_settings",
        uniqueConstraints = @UniqueConstraint(name = "uk_employee_settings_org", columnNames = "org_code")
)
public class EmployeeSetting extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_code", nullable = false, length = 3)
    private String orgCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "code_mode", nullable = false, length = 20)
    private EmployeeCodeMode codeMode = EmployeeCodeMode.MANUAL;

    @Column(name = "prefix_value", nullable = false, length = 30)
    private String prefix = "EMP";

    @Column(name = "suffix_value", length = 30)
    private String suffix = "";

    @Column(name = "starting_number", nullable = false)
    private Integer startingNumber = 1;

    @Column(name = "number_padding", nullable = false)
    private Integer numberPadding = 4;
}
