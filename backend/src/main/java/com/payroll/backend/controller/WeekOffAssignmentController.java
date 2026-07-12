package com.payroll.backend.controller;

import com.payroll.backend.domain.enums.WeekOffAssignmentType;
import com.payroll.backend.dto.common.MessageResponse;
import com.payroll.backend.dto.weekoff.WeekOffAssignmentRequest;
import com.payroll.backend.dto.weekoff.WeekOffAssignmentResponse;
import com.payroll.backend.service.WeekOffAssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
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
            @RequestParam(required = false) Long employeeId
    ) {
        return weekOffAssignmentService.search(type, employeeId);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER')")
    public List<WeekOffAssignmentResponse> create(@Valid @RequestBody WeekOffAssignmentRequest request) {
        return weekOffAssignmentService.create(request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR','MANAGER')")
    public MessageResponse delete(@PathVariable Long id) {
        weekOffAssignmentService.delete(id);
        return new MessageResponse("Week off assignment deleted");
    }
}
