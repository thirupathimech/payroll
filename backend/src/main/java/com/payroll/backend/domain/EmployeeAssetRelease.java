package com.payroll.backend.domain;

import com.payroll.backend.domain.enums.AssetReturnStatus;
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
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "employee_asset_releases")
public class EmployeeAssetRelease extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_code", nullable = false, length = 3)
    private String orgCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resignation_request_id", nullable = false)
    private ResignationRequest resignation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "asset_catalog_item_id", nullable = false)
    private AssetCatalogItem assetCatalogItem;

    /** Immutable catalog values preserved for the clearance audit trail. */
    @Column(name = "asset_name", nullable = false, length = 120)
    private String assetName;

    @Column(name = "asset_category", length = 80)
    private String assetCategory;

    @Column(nullable = false)
    private boolean returnable;

    @Column(name = "released_on", nullable = false)
    private LocalDate releasedOn;

    @Enumerated(EnumType.STRING)
    @Column(name = "return_status", nullable = false, length = 32)
    private AssetReturnStatus returnStatus = AssetReturnStatus.PENDING;

    @Column(name = "returned_on")
    private LocalDate returnedOn;

    @Column(name = "recovery_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal recoveryAmount = BigDecimal.ZERO;

    @Column(name = "condition_note", length = 800)
    private String conditionNote;

    @Column(name = "verified_by", length = 160)
    private String verifiedBy;

    @Column(name = "verified_at")
    private Instant verifiedAt;
}
