package com.payroll.backend.controller;

import com.payroll.backend.dto.common.MessageResponse;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.designation.DesignationRequest;
import com.payroll.backend.dto.designation.DesignationResponse;
import com.payroll.backend.service.DesignationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/designations")
public class DesignationController {

    private final DesignationService designationService;

    @GetMapping
    public PageResponse<DesignationResponse> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return designationService.search(search, departmentId, active, page, size);
    }

    @GetMapping("/{id}")
    public DesignationResponse get(@PathVariable Long id) {
        return designationService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public DesignationResponse create(@Valid @RequestBody DesignationRequest request) {
        return designationService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public DesignationResponse update(@PathVariable Long id, @Valid @RequestBody DesignationRequest request) {
        return designationService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public MessageResponse delete(@PathVariable Long id) {
        designationService.delete(id);
        return new MessageResponse("Designation deactivated");
    }
}
