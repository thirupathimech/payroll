package com.payroll.backend.service;

import com.payroll.backend.domain.AppUser;
import com.payroll.backend.domain.EmployeeSetting;
import com.payroll.backend.domain.CompanySetting;
import com.payroll.backend.domain.enums.RoleName;
import com.payroll.backend.dto.auth.AuthResponse;
import com.payroll.backend.dto.auth.LoginRequest;
import com.payroll.backend.dto.auth.RegisterRequest;
import com.payroll.backend.dto.auth.UserSummary;
import com.payroll.backend.repository.AppUserRepository;
import com.payroll.backend.repository.EmployeeSettingRepository;
import com.payroll.backend.repository.CompanySettingRepository;
import com.payroll.backend.security.JwtService;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    private final JwtService jwtService;
    private final AppUserRepository userRepository;
    private final CompanySettingRepository companySettingRepository;
    private final EmployeeSettingRepository employeeSettingRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final BranchService branchService;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String orgCode = normalizeOrgCode(request.orgCode());
        String identifier = request.email().trim().toLowerCase(Locale.ROOT);
        AppUser user = userRepository.findByOrgCodeAndUsernameIgnoreCase(orgCode, identifier)
                .or(() -> userRepository.findByOrgCodeAndEmailIgnoreCase(orgCode, identifier))
                .orElseThrow(() -> new org.springframework.security.authentication.BadCredentialsException("Invalid credentials"));
        if (!user.isEnabled() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid credentials");
        }

        UserPrincipal principal = UserPrincipal.from(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                principal.getAuthorities()
        );
        String token = jwtService.generateToken(authentication);
        auditService.logForOrg(orgCode, "AUTH_LOGIN", "AppUser", principal.id(), "User logged in");

        return new AuthResponse(
                token,
                "Bearer",
                jwtService.getExpirationSeconds(),
                toSummary(user)
        );
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String orgCode = generateOrgCode(request.companyName());
        String email = request.email().trim().toLowerCase(Locale.ROOT);

        AppUser admin = new AppUser();
        admin.setOrgCode(orgCode);
        admin.setUsername(email);
        admin.setEmail(email);
        admin.setEmployeeCode("ADMIN");
        admin.setFullName(request.fullName().trim());
        admin.setPasswordHash(passwordEncoder.encode(request.password()));
        admin.setRole(RoleName.ADMIN);
        admin.setEnabled(true);
        AppUser savedUser = userRepository.save(admin);

        CompanySetting setting = new CompanySetting();
        setting.setOrgCode(orgCode);
        setting.setCompanyName(request.companyName().trim());
        setting.setLegalName(request.companyName().trim());
        setting.setEmail(email);
        setting.setCurrency("USD");
        setting.setTimezone("UTC");
        setting.setPayrollCutoffDay(25);
        companySettingRepository.save(setting);

        EmployeeSetting employeeSetting = new EmployeeSetting();
        employeeSetting.setOrgCode(orgCode);
        employeeSettingRepository.save(employeeSetting);
        branchService.ensureDefaultBranch(orgCode);

        UserPrincipal principal = UserPrincipal.from(savedUser);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                principal.getAuthorities()
        );
        String token = jwtService.generateToken(authentication);
        auditService.logForOrg(orgCode, "ORG_REGISTERED", "AppUser", savedUser.getId(), "Organization registered");

        return new AuthResponse(token, "Bearer", jwtService.getExpirationSeconds(), toSummary(savedUser));
    }

    @Transactional(readOnly = true)
    public UserSummary me(UserPrincipal principal) {
        AppUser user = userRepository.findByOrgCodeAndUsernameIgnoreCase(principal.orgCode(), principal.username())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
        return toSummary(user);
    }

    private UserSummary toSummary(AppUser user) {
        return new UserSummary(user.getId(), user.getOrgCode(), user.getEmail(), user.getFullName(), user.getRole());
    }

    private String generateOrgCode(String companyName) {
        String base = companyName == null ? "" : companyName.toUpperCase(Locale.ROOT).replaceAll("[^A-Z]", "");
        if (base.length() >= 3) {
            String candidate = base.substring(0, 3);
            if (!userRepository.existsByOrgCode(candidate)) {
                return candidate;
            }
        }

        String candidate;
        do {
            candidate = randomOrgCode();
        } while (userRepository.existsByOrgCode(candidate));
        return candidate;
    }

    private String randomOrgCode() {
        StringBuilder builder = new StringBuilder(3);
        for (int index = 0; index < 3; index++) {
            builder.append(LETTERS.charAt(RANDOM.nextInt(LETTERS.length())));
        }
        return builder.toString();
    }

    private String normalizeOrgCode(String orgCode) {
        String normalized = orgCode == null ? "" : orgCode.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z]{3}")) {
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid organization code");
        }
        return normalized;
    }
}
