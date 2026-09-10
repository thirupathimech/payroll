package com.payroll.backend.dto.exit;

import com.payroll.backend.dto.payroll.PayrollEntryResponse;
import com.payroll.backend.dto.resignation.ResignationResponse;

import java.util.List;

public record ExitClearanceResponse(
        ResignationResponse resignation,
        ExitEmployeeResponse employee,
        List<AssetReleaseResponse> assetReleases,
        AssetClearanceSummaryResponse clearance,
        FinalSettlementResponse settlement,
        PayrollEntryResponse finalPayslip,
        ExitFinancialSummaryResponse financialSummary,
        boolean noDuesEligible
) { }
