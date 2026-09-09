package com.payroll.backend.controller;

import com.payroll.backend.dto.common.MessageResponse;
import com.payroll.backend.dto.weekoff.WeekOffExclusionRequest;
import com.payroll.backend.dto.weekoff.WeekOffExclusionResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.WeekOffExclusionService;
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
@RequestMapping("/api/v1/week-off-exclusions")
public class WeekOffExclusionController {

    private final WeekOffExclusionService weekOffExclusionService;

    @GetMapping
    public List<WeekOffExclusionResponse> search(@AuthenticationPrincipal UserPrincipal principal) {
        return weekOffExclusionService.search(principal);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER')")
    public WeekOffExclusionResponse create(
            @Valid @RequestBody WeekOffExclusionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return weekOffExclusionService.create(request, principal);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER')")
    public MessageResponse delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        weekOffExclusionService.delete(id, principal);
        return new MessageResponse("Week off exclusion deleted");
    }
}
