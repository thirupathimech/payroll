package com.payroll.backend.controller;

import com.payroll.backend.dto.common.MessageResponse;
import com.payroll.backend.dto.shift.ShiftAssignmentRequest;
import com.payroll.backend.dto.shift.ShiftAssignmentResponse;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.ShiftAssignmentService;
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

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/shift-assignments")
public class ShiftAssignmentController {

    private final ShiftAssignmentService shiftAssignmentService;

    @GetMapping
    public List<ShiftAssignmentResponse> search(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return shiftAssignmentService.search(employeeId, startDate, endDate, principal);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD')")
    public List<ShiftAssignmentResponse> create(
            @Valid @RequestBody ShiftAssignmentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return shiftAssignmentService.create(request, principal);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER','LEAD')")
    public MessageResponse delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        shiftAssignmentService.delete(id, principal);
        return new MessageResponse("Shift assignment deleted");
    }
}
