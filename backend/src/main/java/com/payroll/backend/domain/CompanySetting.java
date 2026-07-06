package com.payroll.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
        name = "company_settings",
        uniqueConstraints = @UniqueConstraint(name = "uk_company_settings_org", columnNames = "org_code")
)
public class CompanySetting extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_code", nullable = false, length = 3)
    private String orgCode;

    @Column(nullable = false, length = 180)
    private String companyName;

    @Column(length = 220)
    private String legalName;

    @Column(length = 80)
    private String taxId;

    @Column(length = 160)
    private String email;

    @Column(length = 40)
    private String phone;

    @Column(length = 700)
    private String address;

    @Column(nullable = false, length = 10)
    private String currency = "USD";

    @Column(nullable = false, length = 80)
    private String timezone = "UTC";

    @Column(nullable = false)
    private Integer payrollCutoffDay = 25;
}
