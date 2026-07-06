package com.payroll.backend.controller;

import com.payroll.backend.dto.common.MessageResponse;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.user.UserRequest;
import com.payroll.backend.dto.user.UserResponse;
import com.payroll.backend.service.UserManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/v1/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserManagementController {

    private final UserManagementService userManagementService;

    @GetMapping
    public PageResponse<UserResponse> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return userManagementService.search(search, enabled, page, size);
    }

    @PostMapping
    public UserResponse create(@Valid @RequestBody UserRequest request) {
        return userManagementService.create(request);
    }

    @PutMapping("/{id}")
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody UserRequest request) {
        return userManagementService.update(id, request);
    }

    @PostMapping("/{id}/reset-password")
    public MessageResponse resetPassword(@PathVariable Long id) {
        userManagementService.resetPassword(id);
        return new MessageResponse("Password reset to Pass@1234");
    }
}
