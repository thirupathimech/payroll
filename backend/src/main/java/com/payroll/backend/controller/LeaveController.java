package com.payroll.backend.controller;

import com.payroll.backend.domain.enums.LeaveStatus;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.leave.LeaveCreateRequest;
import com.payroll.backend.dto.leave.LeaveDecisionRequest;
import com.payroll.backend.dto.leave.LeaveResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.LeaveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/leaves")
public class LeaveController {

    private final LeaveService leaveService;

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
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','EMPLOYEE')")
    public LeaveResponse create(@Valid @RequestBody LeaveCreateRequest request, @AuthenticationPrincipal UserPrincipal principal) {
        return leaveService.create(request, principal);
    }

    @PatchMapping("/{id}/decision")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER')")
    public LeaveResponse decide(
            @PathVariable Long id,
            @Valid @RequestBody LeaveDecisionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return leaveService.decide(id, request, principal);
    }
}
