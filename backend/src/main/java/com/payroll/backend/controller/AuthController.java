package com.payroll.backend.controller;

import com.payroll.backend.dto.auth.AuthResponse;
import com.payroll.backend.dto.auth.LoginRequest;
import com.payroll.backend.dto.auth.RegisterRequest;
import com.payroll.backend.dto.auth.UserSummary;
import com.payroll.backend.security.UserPrincipal;
import com.payroll.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @GetMapping("/me")
    public UserSummary me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.me(principal);
    }
}
