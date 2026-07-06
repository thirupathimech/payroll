package com.payroll.backend.domain;

import com.payroll.backend.domain.enums.RoleName;
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
        name = "app_users",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_app_users_org_username", columnNames = {"org_code", "username"}),
                @UniqueConstraint(name = "uk_app_users_org_email", columnNames = {"org_code", "email"}),
                @UniqueConstraint(name = "uk_app_users_org_employee_code", columnNames = {"org_code", "employee_code"})
        }
)
public class AppUser extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_code", nullable = false, length = 3)
    private String orgCode;

    @Column(nullable = false, length = 80)
    private String username;

    @Column(nullable = false, length = 160)
    private String email;

    @Column(name = "employee_code", length = 40)
    private String employeeCode;

    @Column(nullable = false, length = 160)
    private String fullName;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private RoleName role;

    @Column(nullable = false)
    private boolean enabled = true;
}
