package com.payroll.backend.domain;

import com.payroll.backend.domain.enums.ResignationStatus;
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

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "resignation_requests")
public class ResignationRequest extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_code", nullable = false, length = 3)
    private String orgCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "resignation_date", nullable = false)
    private LocalDate resignationDate;

    @Column(name = "proposed_last_working_date", nullable = false)
    private LocalDate proposedLastWorkingDate;

    @Column(name = "approved_last_working_date")
    private LocalDate approvedLastWorkingDate;

    private LocalDate relievingDate;

    @Column(nullable = false, length = 800)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ResignationStatus status = ResignationStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by_id", nullable = false)
    private AppUser requestedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private AppUser reviewedBy;

    private Instant reviewedAt;

    @Column(length = 800)
    private String reviewerComment;

    private Instant separatedAt;

    @Column(name = "asset_clearance_completed_at")
    private Instant assetClearanceCompletedAt;

    @Column(name = "asset_clearance_completed_by", length = 160)
    private String assetClearanceCompletedBy;
}
