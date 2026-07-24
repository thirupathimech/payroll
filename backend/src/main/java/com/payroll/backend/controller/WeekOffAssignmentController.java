package com.payroll.backend.controller;

import com.payroll.backend.domain.enums.WeekOffAssignmentType;
import com.payroll.backend.dto.common.MessageResponse;
import com.payroll.backend.dto.weekoff.WeekOffAssignmentRequest;
import com.payroll.backend.dto.weekoff.WeekOffAssignmentResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.WeekOffAssignmentService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/week-off-assignments")
public class WeekOffAssignmentController {

    private final WeekOffAssignmentService weekOffAssignmentService;

    @GetMapping
    public List<WeekOffAssignmentResponse> search(
            @RequestParam(required = false) WeekOffAssignmentType type,
            @RequestParam(required = false) Long employeeId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return weekOffAssignmentService.search(type, employeeId, principal);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD')")
    public List<WeekOffAssignmentResponse> create(
            @Valid @RequestBody WeekOffAssignmentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return weekOffAssignmentService.create(request, principal);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD')")
    public MessageResponse delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        weekOffAssignmentService.delete(id, principal);
        return new MessageResponse("Week off assignment deleted");
    }
}
