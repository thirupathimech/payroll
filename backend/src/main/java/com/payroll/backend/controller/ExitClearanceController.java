package com.payroll.backend.controller;

import com.payroll.backend.dto.exit.AssetCatalogItemRequest;
import com.payroll.backend.dto.exit.AssetCatalogItemResponse;
import com.payroll.backend.dto.exit.AssetReleaseCreateRequest;
import com.payroll.backend.dto.exit.AssetReturnUpdateRequest;
import com.payroll.backend.dto.exit.ExitClearanceResponse;
import com.payroll.backend.dto.exit.FinalSettlementRequest;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.ExitClearanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/exit-clearance")
@PreAuthorize("hasAnyRole('ADMIN','HR')")
public class ExitClearanceController {

    private final ExitClearanceService exitClearanceService;

    @GetMapping("/assets")
    public List<AssetCatalogItemResponse> catalog() {
        return exitClearanceService.catalog();
    }

    @PostMapping("/assets")
    public AssetCatalogItemResponse createCatalogItem(@Valid @RequestBody AssetCatalogItemRequest request) {
        return exitClearanceService.createCatalogItem(request);
    }

    @PutMapping("/assets/{id}")
    public AssetCatalogItemResponse updateCatalogItem(@PathVariable Long id, @Valid @RequestBody AssetCatalogItemRequest request) {
        return exitClearanceService.updateCatalogItem(id, request);
    }

    @GetMapping("/resignations/{resignationId}")
    public ExitClearanceResponse clearance(@PathVariable Long resignationId) {
        return exitClearanceService.clearance(resignationId);
    }

    @PostMapping("/resignations/{resignationId}/assets")
    public ExitClearanceResponse releaseAsset(
            @PathVariable Long resignationId,
            @Valid @RequestBody AssetReleaseCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return exitClearanceService.releaseAsset(resignationId, request, principal);
    }

    @PatchMapping("/assets/release/{releaseId}")
    public ExitClearanceResponse updateReturn(
            @PathVariable Long releaseId,
            @Valid @RequestBody AssetReturnUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return exitClearanceService.updateAssetReturn(releaseId, request, principal);
    }

    @PostMapping("/resignations/{resignationId}/complete")
    public ExitClearanceResponse complete(
            @PathVariable Long resignationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return exitClearanceService.completeAssetClearance(resignationId, principal);
    }

    @PutMapping("/resignations/{resignationId}/settlement")
    public ExitClearanceResponse updateSettlement(
            @PathVariable Long resignationId,
            @Valid @RequestBody FinalSettlementRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return exitClearanceService.updateSettlement(resignationId, request, principal);
    }
}
