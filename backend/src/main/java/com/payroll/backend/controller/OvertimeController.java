package com.payroll.backend.controller;

import com.payroll.backend.domain.enums.OvertimeStatus;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.overtime.OvertimeCreateRequest;
import com.payroll.backend.dto.overtime.OvertimeDecisionRequest;
import com.payroll.backend.dto.overtime.OvertimeResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.OvertimeService;
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
@RequestMapping("/api/v1/overtime-requests")
public class OvertimeController {

    private final OvertimeService overtimeService;

    @GetMapping
    public PageResponse<OvertimeResponse> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) OvertimeStatus status,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return overtimeService.search(search, status, mine, page, size, principal);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD','EMPLOYEE')")
    public OvertimeResponse create(
            @Valid @RequestBody OvertimeCreateRequest request, @AuthenticationPrincipal UserPrincipal principal
    ) {
        return overtimeService.create(request, principal);
    }

    @PatchMapping("/{id}/decision")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD')")
    public OvertimeResponse decide(
            @PathVariable Long id, @Valid @RequestBody OvertimeDecisionRequest request, @AuthenticationPrincipal UserPrincipal principal
    ) {
        return overtimeService.decide(id, request, principal);
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD','EMPLOYEE')")
    public OvertimeResponse cancel(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return overtimeService.cancel(id, principal);
    }
}
