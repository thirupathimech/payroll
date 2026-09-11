package com.payroll.backend.controller;

import com.payroll.backend.dto.common.MessageResponse;
import com.payroll.backend.dto.overtime.OvertimeEligibilityResponse;
import com.payroll.backend.dto.overtime.OvertimePolicyRequest;
import com.payroll.backend.dto.overtime.OvertimePolicyResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.OvertimePolicyService;
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
@RequestMapping("/api/v1/overtime-policies")
public class OvertimePolicyController {

    private final OvertimePolicyService overtimePolicyService;

    @GetMapping("/me/eligibility")
    public OvertimeEligibilityResponse myEligibility(@AuthenticationPrincipal UserPrincipal principal) {
        return overtimePolicyService.myEligibility(principal);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public List<OvertimePolicyResponse> list() {
        return overtimePolicyService.list();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public OvertimePolicyResponse save(@Valid @RequestBody OvertimePolicyRequest request) {
        return overtimePolicyService.save(request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public MessageResponse deactivate(@PathVariable Long id) {
        overtimePolicyService.deactivate(id);
        return new MessageResponse("Overtime policy deactivated");
    }
}
