package com.payroll.backend.controller;

import com.payroll.backend.dto.common.MessageResponse;
import com.payroll.backend.dto.payroll.PayrollEntryResponse;
import com.payroll.backend.dto.payroll.PayrollRunCreateRequest;
import com.payroll.backend.dto.payroll.PayrollRunResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.PayrollService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/payroll")
public class PayrollController {

    private final PayrollService payrollService;

    @GetMapping("/runs")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public List<PayrollRunResponse> runs() {
        return payrollService.runs();
    }

    @GetMapping("/runs/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public PayrollRunResponse run(@PathVariable Long id) {
        return payrollService.run(id);
    }

    @PostMapping("/runs")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public PayrollRunResponse create(
            @Valid @RequestBody PayrollRunCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return payrollService.create(request, principal);
    }

    @PostMapping("/runs/{id}/recalculate")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public PayrollRunResponse recalculate(@PathVariable Long id) {
        return payrollService.recalculate(id);
    }

    @PostMapping("/runs/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public PayrollRunResponse approve(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return payrollService.approve(id, principal);
    }

    @PostMapping("/runs/{id}/lock")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public PayrollRunResponse lock(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return payrollService.lock(id, principal);
    }

    @DeleteMapping("/runs/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public MessageResponse deleteDraft(@PathVariable Long id) {
        payrollService.deleteDraft(id);
        return new MessageResponse("Draft payroll deleted");
    }

    @GetMapping("/entries/{entryId}")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public PayrollEntryResponse entry(@PathVariable Long entryId) {
        return payrollService.entry(entryId);
    }

    @GetMapping("/my/payslips")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD','EMPLOYEE')")
    public List<PayrollEntryResponse> myPayslips(@AuthenticationPrincipal UserPrincipal principal) {
        return payrollService.myPayslips(principal);
    }
}
