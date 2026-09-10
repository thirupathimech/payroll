package com.payroll.backend.controller;

import com.payroll.backend.domain.enums.ResignationStatus;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.resignation.ResignationCreateRequest;
import com.payroll.backend.dto.resignation.ResignationDecisionRequest;
import com.payroll.backend.dto.resignation.ResignationResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.ResignationService;
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
@RequestMapping("/api/v1/resignations")
public class ResignationController {
    private final ResignationService resignationService;

    @GetMapping
    public PageResponse<ResignationResponse> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ResignationStatus status,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return resignationService.search(search, status, mine, page, size, principal);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD','EMPLOYEE')")
    public ResignationResponse create(@Valid @RequestBody ResignationCreateRequest request, @AuthenticationPrincipal UserPrincipal principal) {
        return resignationService.create(request, principal);
    }

    @PatchMapping("/{id}/decision")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public ResignationResponse decide(
            @PathVariable Long id, @Valid @RequestBody ResignationDecisionRequest request, @AuthenticationPrincipal UserPrincipal principal
    ) {
        return resignationService.decide(id, request, principal);
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD','EMPLOYEE')")
    public ResignationResponse cancel(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return resignationService.cancel(id, principal);
    }
}
