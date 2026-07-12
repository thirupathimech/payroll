package com.payroll.backend.controller;

import com.payroll.backend.dto.branch.BranchRequest;
import com.payroll.backend.dto.branch.BranchResponse;
import com.payroll.backend.service.BranchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/branches")
public class BranchController {

    private final BranchService branchService;

    @GetMapping("/active")
    public List<BranchResponse> active() {
        return branchService.active();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public BranchResponse create(@Valid @RequestBody BranchRequest request) {
        return branchService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public BranchResponse update(@PathVariable Long id, @Valid @RequestBody BranchRequest request) {
        return branchService.update(id, request);
    }
}
