package com.payroll.backend.controller;

import com.payroll.backend.dto.dashboard.DashboardSummaryResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public DashboardSummaryResponse summary(@AuthenticationPrincipal UserPrincipal principal) {
        return dashboardService.summary(principal);
    }
}
