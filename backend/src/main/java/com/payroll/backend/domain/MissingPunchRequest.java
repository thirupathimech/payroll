package com.payroll.backend.domain;

import com.payroll.backend.domain.enums.MissingPunchStatus;
import com.payroll.backend.domain.enums.MissingPunchType;
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

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "missing_punch_requests")
public class MissingPunchRequest extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_code", nullable = false, length = 3)
    private String orgCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "punch_date", nullable = false)
    private LocalDate punchDate;

    @Column(name = "punch_time", nullable = false)
    private LocalTime punchTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "punch_type", nullable = false, length = 10)
    private MissingPunchType punchType;

    @Column(nullable = false, length = 800)
    private String remark;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private MissingPunchStatus status = MissingPunchStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private AppUser reviewedBy;

    private Instant reviewedAt;

    @Column(length = 800)
    private String reviewerComment;
}
