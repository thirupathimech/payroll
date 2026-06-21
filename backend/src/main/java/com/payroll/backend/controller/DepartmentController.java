package com.payroll.backend.controller;

import com.payroll.backend.dto.common.MessageResponse;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.department.DepartmentRequest;
import com.payroll.backend.dto.department.DepartmentResponse;
import com.payroll.backend.service.DepartmentService;
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

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    @GetMapping
    public PageResponse<DepartmentResponse> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return departmentService.search(search, active, page, size);
    }

    @GetMapping("/active")
    public List<DepartmentResponse> active() {
        return departmentService.listActive();
    }

    @GetMapping("/{id}")
    public DepartmentResponse get(@PathVariable Long id) {
        return departmentService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public DepartmentResponse create(@Valid @RequestBody DepartmentRequest request) {
        return departmentService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public DepartmentResponse update(@PathVariable Long id, @Valid @RequestBody DepartmentRequest request) {
        return departmentService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public MessageResponse delete(@PathVariable Long id) {
        departmentService.delete(id);
        return new MessageResponse("Department deactivated");
    }
}
