package com.payroll.backend.service;

import com.payroll.backend.domain.AppUser;
import com.payroll.backend.domain.enums.RoleName;
import com.payroll.backend.dto.auth.AuthResponse;
import com.payroll.backend.dto.auth.LoginRequest;
import com.payroll.backend.dto.auth.UserSummary;
import com.payroll.backend.repository.AppUserRepository;
import com.payroll.backend.security.JwtService;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AppUserRepository userRepository;
    private final AuditService auditService;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String token = jwtService.generateToken(authentication);
        auditService.log("AUTH_LOGIN", "AppUser", principal.id(), "User logged in");

        return new AuthResponse(
                token,
                "Bearer",
                jwtService.getExpirationSeconds(),
                new UserSummary(principal.id(), principal.email(), principal.fullName(), roleFromPrincipal(principal))
        );
    }

    @Transactional(readOnly = true)
    public UserSummary me(UserPrincipal principal) {
        AppUser user = userRepository.findByEmail(principal.email())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
        return new UserSummary(user.getId(), user.getEmail(), user.getFullName(), user.getRole());
    }

    private RoleName roleFromPrincipal(UserPrincipal principal) {
        return principal.authorities().stream()
                .findFirst()
                .map(authority -> authority.getAuthority().replace("ROLE_", ""))
                .map(RoleName::valueOf)
                .orElse(RoleName.EMPLOYEE);
    }
}
