package com.payroll.backend.controller;

import com.payroll.backend.domain.enums.LeaveStatus;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.leave.LeaveCreateRequest;
import com.payroll.backend.dto.leave.LeaveDecisionRequest;
import com.payroll.backend.dto.leave.LeaveBalanceResponse;
import com.payroll.backend.dto.leave.LeaveBalanceUpdateRequest;
import com.payroll.backend.dto.leave.LeaveResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.LeaveBalanceService;
import com.payroll.backend.service.LeaveService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/leaves")
public class LeaveController {

    private final LeaveService leaveService;
    private final LeaveBalanceService leaveBalanceService;

    @GetMapping("/balances")
    public List<LeaveBalanceResponse> balances(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Integer year,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return leaveBalanceService.getBalances(employeeId, year, principal);
    }

    @PutMapping("/balances/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public List<LeaveBalanceResponse> updateBalances(
            @PathVariable Long employeeId,
            @Valid @RequestBody LeaveBalanceUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return leaveBalanceService.updateBalances(employeeId, request, principal);
    }

    @GetMapping
    public PageResponse<LeaveResponse> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) LeaveStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return leaveService.search(search, employeeId, status, page, size, principal);
    }

    @GetMapping("/{id}")
    public LeaveResponse get(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return leaveService.get(id, principal);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD','EMPLOYEE')")
    public LeaveResponse create(@Valid @RequestBody LeaveCreateRequest request, @AuthenticationPrincipal UserPrincipal principal) {
        return leaveService.create(request, principal);
    }

    @PatchMapping("/{id}/decision")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD')")
    public LeaveResponse decide(
            @PathVariable Long id,
            @Valid @RequestBody LeaveDecisionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return leaveService.decide(id, request, principal);
    }
}
