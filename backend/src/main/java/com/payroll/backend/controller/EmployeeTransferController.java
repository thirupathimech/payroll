package com.payroll.backend.controller;

import com.payroll.backend.domain.enums.EmployeeTransferStatus;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.transfer.EmployeeTransferCreateRequest;
import com.payroll.backend.dto.transfer.EmployeeTransferDecisionRequest;
import com.payroll.backend.dto.transfer.EmployeeTransferResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.EmployeeTransferService;
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
@RequestMapping("/api/v1/employee-transfers")
public class EmployeeTransferController {
    private final EmployeeTransferService transferService;

    @GetMapping
    public PageResponse<EmployeeTransferResponse> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) EmployeeTransferStatus status,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return transferService.search(search, status, mine, page, size, principal);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD','EMPLOYEE')")
    public EmployeeTransferResponse create(@Valid @RequestBody EmployeeTransferCreateRequest request, @AuthenticationPrincipal UserPrincipal principal) {
        return transferService.create(request, principal);
    }

    @PatchMapping("/{id}/decision")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public EmployeeTransferResponse decide(
            @PathVariable Long id, @Valid @RequestBody EmployeeTransferDecisionRequest request, @AuthenticationPrincipal UserPrincipal principal
    ) {
        return transferService.decide(id, request, principal);
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD','EMPLOYEE')")
    public EmployeeTransferResponse cancel(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return transferService.cancel(id, principal);
    }
}
