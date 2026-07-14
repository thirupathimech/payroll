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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "employees",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_employees_org_code", columnNames = {"org_code", "employee_code"}),
                @UniqueConstraint(name = "uk_employees_org_email", columnNames = {"org_code", "email"})
        }
)
public class Employee extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_code", nullable = false, length = 3)
    private String orgCode;

    @Column(nullable = false, length = 40, updatable = false)
    private String employeeCode;

    @Column(nullable = false, length = 100)
    private String firstName;

    @Column(length = 100)
    private String middleName;

    @Column(nullable = false, length = 100)
    private String lastName;

    @Column(nullable = false, length = 160)
    private String email;

    @Column(length = 160)
    private String personalEmail;

    @Column(length = 40)
    private String phone;

    @Column(length = 40)
    private String alternateMobileNumber;

    @Column(length = 40)
    private String gender;

    @Column(length = 40)
    private String maritalStatus;

    @Column(length = 10)
    private String bloodGroup;

    @Column(length = 80)
    private String nationality;

    @Column(length = 20)
    private String aadhaarNumber;

    private LocalDate dateOfBirth;

    @Column(nullable = false)
    private LocalDate joiningDate;

    private LocalDate confirmationDate;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal baseSalary;

    @Column(length = 40)
    private String employmentType;

    @Column(length = 80)
    private String probationPeriod;

    @Column(length = 80)
    private String biometricId;

    @Column(length = 80)
    private String bankAccountNumber;

    @Column(length = 160)
    private String accountHolderName;

    @Column(length = 160)
    private String bankName;

    @Column(length = 40)
    private String ifscCode;

    @Column(length = 80)
    private String taxIdentificationNumber;

    @Column(length = 600)
    private String address;

    @Column(length = 600)
    private String permanentAddress;

    @Column(length = 160)
    private String emergencyContactName;

    @Column(length = 80)
    private String emergencyRelationship;

    @Column(length = 40)
    private String emergencyMobileNumber;

    @Column(length = 120)
    private String primarySkill;

    @Column(length = 120)
    private String secondarySkill;

    @Column(length = 800)
    private String certifications;

    @Column(length = 300)
    private String languagesKnown;

    private LocalDate resignationDate;

    private LocalDate lastWorkingDate;

    @Column(length = 800)
    private String exitReason;

    private LocalDate relievingDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private Employee manager;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hr_manager_id")
    private Employee hrManager;

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
