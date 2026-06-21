package com.payroll.backend.domain;

import com.payroll.backend.domain.enums.EmploymentStatus;
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

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "employees")
public class Employee extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String employeeCode;

    @Column(nullable = false, length = 100)
    private String firstName;

    @Column(nullable = false, length = 100)
    private String lastName;

    @Column(nullable = false, unique = true, length = 160)
    private String email;

    @Column(length = 40)
    private String phone;

    private LocalDate dateOfBirth;

    @Column(nullable = false)
    private LocalDate joiningDate;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal baseSalary;

    @Column(length = 80)
    private String bankAccountNumber;

    @Column(length = 80)
    private String taxIdentificationNumber;

    @Column(length = 600)
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private EmploymentStatus status = EmploymentStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "designation_id", nullable = false)
    private Designation designation;
}
