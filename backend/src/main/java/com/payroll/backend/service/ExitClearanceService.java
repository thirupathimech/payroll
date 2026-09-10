package com.payroll.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.payroll.backend.domain.AssetCatalogItem;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.EmployeeAssetRelease;
import com.payroll.backend.domain.FinalSettlement;
import com.payroll.backend.domain.PayrollEntry;
import com.payroll.backend.domain.ResignationRequest;
import com.payroll.backend.domain.enums.AssetReturnStatus;
import com.payroll.backend.domain.enums.PayrollRunStatus;
import com.payroll.backend.domain.enums.ResignationStatus;
import com.payroll.backend.dto.exit.AssetCatalogItemRequest;
import com.payroll.backend.dto.exit.AssetCatalogItemResponse;
import com.payroll.backend.dto.exit.AssetClearanceSummaryResponse;
import com.payroll.backend.dto.exit.AssetReleaseCreateRequest;
import com.payroll.backend.dto.exit.AssetReleaseResponse;
import com.payroll.backend.dto.exit.AssetReturnUpdateRequest;
import com.payroll.backend.dto.exit.ExitClearanceResponse;
import com.payroll.backend.dto.exit.ExitEmployeeResponse;
import com.payroll.backend.dto.exit.ExitFinancialSummaryResponse;
import com.payroll.backend.dto.exit.FinalSettlementRequest;
import com.payroll.backend.dto.exit.FinalSettlementResponse;
import com.payroll.backend.dto.payroll.PayrollComponentLineResponse;
import com.payroll.backend.dto.payroll.PayrollEntryResponse;
import com.payroll.backend.dto.resignation.ResignationResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.AssetCatalogItemRepository;
import com.payroll.backend.repository.EmployeeAssetReleaseRepository;
import com.payroll.backend.repository.FinalSettlementRepository;
import com.payroll.backend.repository.PayrollEntryRepository;
import com.payroll.backend.repository.ResignationRequestRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * HR's exit-clearance workbench. It intentionally uses the approved
 * resignation as the single source of truth so items, settlement, and all
 * exit documents refer to the same final working date.
 */
@Service
@RequiredArgsConstructor
public class ExitClearanceService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    private static final TypeReference<List<PayrollComponentLineResponse>> COMPONENT_LINES = new TypeReference<>() { };

    private final AssetCatalogItemRepository assetCatalogItemRepository;
    private final EmployeeAssetReleaseRepository employeeAssetReleaseRepository;
    private final FinalSettlementRepository finalSettlementRepository;
    private final ResignationRequestRepository resignationRepository;
    private final PayrollEntryRepository payrollEntryRepository;
    private final CurrentOrgService currentOrgService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<AssetCatalogItemResponse> catalog() {
        return assetCatalogItemRepository.findByOrgCodeOrderByActiveDescNameAsc(currentOrgService.orgCode())
                .stream().map(this::toCatalogResponse).toList();
    }

    @Transactional
    public AssetCatalogItemResponse createCatalogItem(AssetCatalogItemRequest request) {
        AssetCatalogItem item = new AssetCatalogItem();
        item.setOrgCode(currentOrgService.orgCode());
        applyCatalogRequest(item, request);
        AssetCatalogItem saved = assetCatalogItemRepository.save(item);
        auditService.log("EXIT_ASSET_CATALOG_CREATED", "AssetCatalogItem", saved.getId(), saved.getName());
        return toCatalogResponse(saved);
    }

    @Transactional
    public AssetCatalogItemResponse updateCatalogItem(Long id, AssetCatalogItemRequest request) {
        AssetCatalogItem item = assetCatalogItemRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset catalog item not found"));
        applyCatalogRequest(item, request);
        AssetCatalogItem saved = assetCatalogItemRepository.save(item);
        auditService.log("EXIT_ASSET_CATALOG_UPDATED", "AssetCatalogItem", saved.getId(), saved.getName());
        return toCatalogResponse(saved);
    }

    @Transactional
    public ExitClearanceResponse clearance(Long resignationId) {
        ResignationRequest resignation = approvedResignation(resignationId);
        List<EmployeeAssetRelease> releases = employeeAssetReleaseRepository.findForResignation(currentOrgService.orgCode(), resignationId);
        FinalSettlement settlement = getOrCreateSettlement(resignation);
        PayrollEntry finalPayslip = latestFinalPayslip(resignation);
        return detail(resignation, releases, settlement, finalPayslip);
    }

    @Transactional
    public ExitClearanceResponse releaseAsset(Long resignationId, AssetReleaseCreateRequest request, UserPrincipal principal) {
        ResignationRequest resignation = editableApprovedResignation(resignationId);
        AssetCatalogItem asset = assetCatalogItemRepository.findByOrgCodeAndId(currentOrgService.orgCode(), request.assetCatalogItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Asset catalog item not found"));
        if (!asset.isActive()) throw new BadRequestException("Inactive asset catalog items cannot be released");

        EmployeeAssetRelease release = new EmployeeAssetRelease();
        release.setOrgCode(currentOrgService.orgCode());
        release.setResignation(resignation);
        release.setAssetCatalogItem(asset);
        release.setAssetName(asset.getName());
        release.setAssetCategory(asset.getCategory());
        release.setReturnable(asset.isReturnable());
        release.setReleasedOn(request.releasedOn());
        release.setReturnStatus(asset.isReturnable() ? AssetReturnStatus.PENDING : AssetReturnStatus.NOT_REQUIRED);
        release.setRecoveryAmount(ZERO);
        release.setConditionNote(blankToNull(request.conditionNote()));
        employeeAssetReleaseRepository.save(release);
        resetClearance(resignation);
        auditService.log("EXIT_ASSET_RELEASED", "EmployeeAssetRelease", release.getId(),
                resignation.getEmployee().getEmployeeCode() + ": " + asset.getName() + " by " + principal.email());
        return clearance(resignationId);
    }

    @Transactional
    public ExitClearanceResponse updateAssetReturn(Long releaseId, AssetReturnUpdateRequest request, UserPrincipal principal) {
        EmployeeAssetRelease release = employeeAssetReleaseRepository.findForUpdate(currentOrgService.orgCode(), releaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset release not found"));
        assertNotSeparated(release.getResignation());
        validateReturnUpdate(release, request);

        release.setReturnStatus(request.returnStatus());
        release.setReturnedOn(request.returnStatus() == AssetReturnStatus.RETURNED ? request.returnedOn() : null);
        release.setRecoveryAmount(request.returnStatus() == AssetReturnStatus.NOT_RETURNED ? money(request.recoveryAmount()) : ZERO);
        release.setConditionNote(blankToNull(request.conditionNote()));
        if (request.returnStatus() == AssetReturnStatus.PENDING) {
            release.setVerifiedBy(null);
            release.setVerifiedAt(null);
        } else {
            release.setVerifiedBy(principal.email());
            release.setVerifiedAt(Instant.now());
        }
        employeeAssetReleaseRepository.save(release);
        resetClearance(release.getResignation());
        auditService.log("EXIT_ASSET_RETURN_UPDATED", "EmployeeAssetRelease", release.getId(),
                release.getResignation().getEmployee().getEmployeeCode() + ": " + request.returnStatus());
        return clearance(release.getResignation().getId());
    }

    @Transactional
    public ExitClearanceResponse completeAssetClearance(Long resignationId, UserPrincipal principal) {
        ResignationRequest resignation = editableApprovedResignation(resignationId);
        List<EmployeeAssetRelease> releases = employeeAssetReleaseRepository.findForResignation(currentOrgService.orgCode(), resignationId);
        ClearanceNumbers numbers = clearanceNumbers(releases);
        if (!numbers.readyToComplete()) {
            throw new BadRequestException("Record each return, or enter the recovery amount for every asset that was not returned, before completing clearance");
        }
        resignation.setAssetClearanceCompletedAt(Instant.now());
        resignation.setAssetClearanceCompletedBy(principal.email());
        resignationRepository.save(resignation);
        auditService.log("EXIT_ASSET_CLEARANCE_COMPLETED", "ResignationRequest", resignationId,
                resignation.getEmployee().getEmployeeCode());
        return clearance(resignationId);
    }

    @Transactional
    public ExitClearanceResponse updateSettlement(Long resignationId, FinalSettlementRequest request, UserPrincipal principal) {
        ResignationRequest resignation = editableApprovedResignation(resignationId);
        List<EmployeeAssetRelease> releases = employeeAssetReleaseRepository.findForResignation(currentOrgService.orgCode(), resignationId);
        ClearanceNumbers numbers = clearanceNumbers(releases);
        boolean clearanceCompleted = resignation.getAssetClearanceCompletedAt() != null && numbers.readyToComplete();
        if (request.settled() && !clearanceCompleted) {
            throw new BadRequestException("Complete the asset clearance before marking the final settlement as paid");
        }
        if (request.settled() && request.settledOn() == null) {
            throw new BadRequestException("Settlement paid date is required when marking final settlement as paid");
        }
        FinalSettlement settlement = getOrCreateSettlement(resignation);
        settlement.setLeaveEncashmentDays(money(request.leaveEncashmentDays()));
        settlement.setLeaveEncashmentAmount(money(request.leaveEncashmentAmount()));
        settlement.setNoticePayRecovery(money(request.noticePayRecovery()));
        settlement.setOtherEarnings(money(request.otherEarnings()));
        settlement.setOtherDeductions(money(request.otherDeductions()));
        settlement.setRemarks(blankToNull(request.remarks()));
        settlement.setSettled(request.settled());
        settlement.setSettledOn(request.settled() ? request.settledOn() : null);
        settlement.setSettledBy(request.settled() ? principal.email() : null);
        settlement.setSettledAt(request.settled() ? Instant.now() : null);
        finalSettlementRepository.save(settlement);
        auditService.log("FINAL_SETTLEMENT_UPDATED", "FinalSettlement", settlement.getId(),
                resignation.getEmployee().getEmployeeCode() + (request.settled() ? " marked paid" : " saved as draft"));
        return detail(resignation, releases, settlement, latestFinalPayslip(resignation));
    }

    /** Used by the separation scheduler. No manual clearance means no separation. */
    @Transactional(readOnly = true)
    public boolean canSeparate(String orgCode, Long resignationId) {
        ResignationRequest resignation = resignationRepository.findByOrgCodeAndId(orgCode, resignationId).orElse(null);
        if (resignation == null || resignation.getAssetClearanceCompletedAt() == null) return false;
        return clearanceNumbers(employeeAssetReleaseRepository.findForResignation(orgCode, resignationId)).readyToComplete();
    }

    private ExitClearanceResponse detail(ResignationRequest resignation, List<EmployeeAssetRelease> releases,
                                         FinalSettlement settlement, PayrollEntry finalPayslip) {
        ClearanceNumbers numbers = clearanceNumbers(releases);
        boolean clearanceCompleted = resignation.getAssetClearanceCompletedAt() != null && numbers.readyToComplete();
        PayrollEntryResponse payslip = finalPayslip == null ? null : toPayrollEntryResponse(finalPayslip);
        ExitFinancialSummaryResponse finances = financialSummary(payslip, settlement, numbers.assetRecoveryAmount());
        return new ExitClearanceResponse(toResignationResponse(resignation), toEmployeeResponse(resignation.getEmployee()),
                releases.stream().map(this::toAssetReleaseResponse).toList(),
                new AssetClearanceSummaryResponse(numbers.totalAssets(), numbers.returnedAssets(), numbers.pendingAssets(),
                        numbers.recoveredAssets(), numbers.assetRecoveryAmount(), numbers.readyToComplete(), clearanceCompleted,
                        resignation.getAssetClearanceCompletedAt(), resignation.getAssetClearanceCompletedBy()),
                toSettlementResponse(settlement), payslip, finances, clearanceCompleted && settlement.isSettled());
    }

    private void applyCatalogRequest(AssetCatalogItem item, AssetCatalogItemRequest request) {
        BigDecimal recoveryAmount = money(request.defaultRecoveryAmount());
        if (request.returnable() && recoveryAmount.compareTo(ZERO) <= 0) {
            throw new BadRequestException("Enter a recovery amount for every returnable asset");
        }
        item.setName(request.name().trim());
        item.setCategory(blankToNull(request.category()));
        item.setReturnable(request.returnable());
        item.setDefaultRecoveryAmount(request.returnable() ? recoveryAmount : ZERO);
        item.setActive(request.active());
    }

    private void validateReturnUpdate(EmployeeAssetRelease release, AssetReturnUpdateRequest request) {
        if (!release.isReturnable() && request.returnStatus() != AssetReturnStatus.NOT_REQUIRED) {
            throw new BadRequestException("This asset is not returnable; use Not required");
        }
        if (release.isReturnable() && request.returnStatus() == AssetReturnStatus.NOT_REQUIRED) {
            throw new BadRequestException("A returnable asset must be marked returned or not returned");
        }
        if (request.returnStatus() == AssetReturnStatus.RETURNED) {
            if (request.returnedOn() == null) throw new BadRequestException("Return date is required for a returned asset");
            if (request.returnedOn().isBefore(release.getReleasedOn())) {
                throw new BadRequestException("Return date cannot be before release date");
            }
        }
        if (request.returnStatus() == AssetReturnStatus.NOT_RETURNED && money(request.recoveryAmount()).compareTo(ZERO) <= 0) {
            throw new BadRequestException("Enter the recovery amount for an asset that was not returned");
        }
    }

    private void resetClearance(ResignationRequest resignation) {
        if (resignation.getAssetClearanceCompletedAt() != null) {
            resignation.setAssetClearanceCompletedAt(null);
            resignation.setAssetClearanceCompletedBy(null);
            resignationRepository.save(resignation);
        }
    }

    private ResignationRequest approvedResignation(Long resignationId) {
        ResignationRequest resignation = resignationRepository.findByOrgCodeAndId(currentOrgService.orgCode(), resignationId)
                .orElseThrow(() -> new ResourceNotFoundException("Resignation request not found"));
        if (resignation.getStatus() != ResignationStatus.APPROVED) {
            throw new BadRequestException("Exit clearance is available only after the resignation is approved");
        }
        return resignation;
    }

    private ResignationRequest editableApprovedResignation(Long resignationId) {
        ResignationRequest resignation = approvedResignation(resignationId);
        assertNotSeparated(resignation);
        return resignation;
    }

    private void assertNotSeparated(ResignationRequest resignation) {
        if (resignation.getSeparatedAt() != null) {
            throw new BadRequestException("Exit clearance cannot be changed after the employee has been separated");
        }
    }

    private FinalSettlement getOrCreateSettlement(ResignationRequest resignation) {
        return finalSettlementRepository.findByOrgCodeAndResignationId(currentOrgService.orgCode(), resignation.getId())
                .orElseGet(() -> {
                    FinalSettlement settlement = new FinalSettlement();
                    settlement.setOrgCode(currentOrgService.orgCode());
                    settlement.setResignation(resignation);
                    settlement.setLeaveEncashmentDays(ZERO);
                    settlement.setLeaveEncashmentAmount(ZERO);
                    settlement.setNoticePayRecovery(ZERO);
                    settlement.setOtherEarnings(ZERO);
                    settlement.setOtherDeductions(ZERO);
                    return finalSettlementRepository.save(settlement);
                });
    }

    private PayrollEntry latestFinalPayslip(ResignationRequest resignation) {
        List<PayrollEntry> entries = payrollEntryRepository.findEmployeePayslips(currentOrgService.orgCode(),
                resignation.getEmployee().getId(), List.of(PayrollRunStatus.LOCKED, PayrollRunStatus.APPROVED));
        LocalDate lastWorkingDate = resignation.getApprovedLastWorkingDate();
        return entries.stream()
                .filter(entry -> !lastWorkingDate.isBefore(entry.getPayrollRun().getPeriodStart())
                        && !lastWorkingDate.isAfter(entry.getPayrollRun().getPeriodEnd()))
                .findFirst()
                .orElseGet(() -> entries.stream()
                        .filter(entry -> !entry.getPayrollRun().getPeriodEnd().isAfter(lastWorkingDate))
                        .findFirst().orElse(null));
    }

    private ClearanceNumbers clearanceNumbers(List<EmployeeAssetRelease> releases) {
        int returned = 0;
        int pending = 0;
        int recovered = 0;
        BigDecimal recoveryAmount = ZERO;
        for (EmployeeAssetRelease release : releases) {
            if (!release.isReturnable()) continue;
            if (release.getReturnStatus() == AssetReturnStatus.RETURNED) {
                returned++;
            } else if (release.getReturnStatus() == AssetReturnStatus.NOT_RETURNED
                    && money(release.getRecoveryAmount()).compareTo(ZERO) > 0) {
                recovered++;
                recoveryAmount = recoveryAmount.add(money(release.getRecoveryAmount()));
            } else {
                pending++;
            }
        }
        return new ClearanceNumbers(releases.size(), returned, pending, recovered, money(recoveryAmount), pending == 0);
    }

    private ExitFinancialSummaryResponse financialSummary(PayrollEntryResponse payslip, FinalSettlement settlement,
                                                          BigDecimal assetRecoveryAmount) {
        BigDecimal finalNetPay = payslip == null ? ZERO : money(payslip.netPay());
        BigDecimal leave = money(settlement.getLeaveEncashmentAmount());
        BigDecimal otherEarnings = money(settlement.getOtherEarnings());
        BigDecimal notice = money(settlement.getNoticePayRecovery());
        BigDecimal assetRecovery = money(assetRecoveryAmount);
        BigDecimal otherDeductions = money(settlement.getOtherDeductions());
        BigDecimal credits = money(finalNetPay.add(leave).add(otherEarnings));
        BigDecimal deductions = money(notice.add(assetRecovery).add(otherDeductions));
        return new ExitFinancialSummaryResponse(finalNetPay, leave, otherEarnings, credits, notice, assetRecovery,
                otherDeductions, deductions, money(credits.subtract(deductions)));
    }

    private AssetCatalogItemResponse toCatalogResponse(AssetCatalogItem item) {
        return new AssetCatalogItemResponse(item.getId(), item.getName(), item.getCategory(), item.isReturnable(),
                money(item.getDefaultRecoveryAmount()), item.isActive(), item.getCreatedAt(), item.getUpdatedAt());
    }

    private AssetReleaseResponse toAssetReleaseResponse(EmployeeAssetRelease release) {
        return new AssetReleaseResponse(release.getId(), release.getAssetCatalogItem().getId(), release.getAssetName(),
                release.getAssetCategory(), release.isReturnable(), release.getReleasedOn(), release.getReturnStatus(),
                release.getReturnedOn(), money(release.getRecoveryAmount()), release.getConditionNote(), release.getVerifiedBy(),
                release.getVerifiedAt(), release.getCreatedAt(), release.getUpdatedAt());
    }

    private FinalSettlementResponse toSettlementResponse(FinalSettlement settlement) {
        return new FinalSettlementResponse(settlement.getId(), money(settlement.getLeaveEncashmentDays()),
                money(settlement.getLeaveEncashmentAmount()), money(settlement.getNoticePayRecovery()),
                money(settlement.getOtherEarnings()), money(settlement.getOtherDeductions()), settlement.getRemarks(),
                settlement.isSettled(), settlement.getSettledOn(), settlement.getSettledBy(), settlement.getSettledAt(),
                settlement.getUpdatedAt());
    }

    private ExitEmployeeResponse toEmployeeResponse(Employee employee) {
        return new ExitEmployeeResponse(employee.getId(), employee.getEmployeeCode(), fullName(employee), employee.getEmail(),
                employee.getJoiningDate(), employee.getBranch() == null ? null : employee.getBranch().getName(),
                employee.getDepartment().getName(), employee.getDesignation().getTitle());
    }

    private ResignationResponse toResignationResponse(ResignationRequest resignation) {
        Employee employee = resignation.getEmployee();
        return new ResignationResponse(resignation.getId(), employee.getId(), employee.getEmployeeCode(), fullName(employee),
                resignation.getResignationDate(), resignation.getProposedLastWorkingDate(), resignation.getApprovedLastWorkingDate(),
                resignation.getRelievingDate(), resignation.getReason(), resignation.getStatus(), resignation.getRequestedBy().getEmail(),
                resignation.getReviewedBy() == null ? null : resignation.getReviewedBy().getEmail(), resignation.getReviewerComment(),
                resignation.getReviewedAt(), resignation.getSeparatedAt(), resignation.getAssetClearanceCompletedAt(),
                resignation.getAssetClearanceCompletedBy(), resignation.getCreatedAt(), resignation.getUpdatedAt());
    }

    private PayrollEntryResponse toPayrollEntryResponse(PayrollEntry entry) {
        try {
            return new PayrollEntryResponse(entry.getId(), entry.getPayrollRun().getId(), entry.getPayrollRun().getPeriodYear(),
                    entry.getPayrollRun().getPeriodMonth(), entry.getEmployeeCode(), entry.getEmployeeName(), entry.getDepartmentName(),
                    entry.getDesignationTitle(), entry.getBankAccountNumber(), money(entry.getAnnualCtc()), entry.getPeriodDays(),
                    money(entry.getEligibleDays()), money(entry.getWorkingDays()), money(entry.getAttendanceDays()),
                    money(entry.getPaidLeaveDays()), money(entry.getUnpaidLeaveDays()), money(entry.getPayableDays()),
                    money(entry.getGrossEarnings()), money(entry.getTotalDeductions()), money(entry.getEmployerContributions()),
                    money(entry.getReimbursementAmount()), money(entry.getNetPay()),
                    objectMapper.readValue(entry.getComponentLinesJson(), COMPONENT_LINES), entry.getCreatedAt());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Final payslip snapshot is invalid", exception);
        }
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private String fullName(Employee employee) {
        return java.util.stream.Stream.of(employee.getFirstName(), employee.getMiddleName(), employee.getLastName())
                .filter(value -> value != null && !value.isBlank()).collect(java.util.stream.Collectors.joining(" "));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record ClearanceNumbers(int totalAssets, int returnedAssets, int pendingAssets, int recoveredAssets,
                                    BigDecimal assetRecoveryAmount, boolean readyToComplete) { }
}
