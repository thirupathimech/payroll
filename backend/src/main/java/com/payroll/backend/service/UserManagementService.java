package com.payroll.backend.service;

import com.payroll.backend.domain.AppUser;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.user.UserRequest;
import com.payroll.backend.dto.user.UserResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.AppUserRepository;
import com.payroll.backend.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserManagementService {

    public static final String DEFAULT_PASSWORD = "Pass@1234";

    private final AppUserRepository appUserRepository;
    private final EmployeeRepository employeeRepository;
    private final CurrentOrgService currentOrgService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> search(String search, Boolean enabled, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "username"));
        return PageResponse.from(appUserRepository.search(currentOrgService.orgCode(), blankToNull(search), enabled, pageable).map(this::toResponse));
    }

    @Transactional
    public UserResponse create(UserRequest request) {
        Employee employee = findEmployee(request.employeeCode());
        ensureUniqueUser(request.username(), request.employeeCode(), null);

        AppUser user = new AppUser();
        user.setOrgCode(currentOrgService.orgCode());
        user.setUsername(request.username().trim().toLowerCase());
        user.setEmployeeCode(employee.getEmployeeCode());
        user.setEmail(buildLoginEmail(request.username()));
        user.setFullName(employee.getFirstName() + " " + employee.getLastName());
        user.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
        user.setRole(request.role());
        user.setEnabled(request.enabled() == null || request.enabled());

        AppUser saved = appUserRepository.save(user);
        auditService.log("USER_CREATED", "AppUser", saved.getId(), saved.getUsername());
        return toResponse(saved);
    }

    @Transactional
    public UserResponse update(Long id, UserRequest request) {
        AppUser user = findUser(id);
        Employee employee = findEmployee(request.employeeCode());
        ensureUniqueUser(request.username(), request.employeeCode(), id);

        user.setUsername(request.username().trim().toLowerCase());
        user.setEmployeeCode(employee.getEmployeeCode());
        user.setEmail(buildLoginEmail(request.username()));
        user.setFullName(employee.getFirstName() + " " + employee.getLastName());
        user.setRole(request.role());
        user.setEnabled(request.enabled() == null || request.enabled());

        AppUser saved = appUserRepository.save(user);
        auditService.log("USER_UPDATED", "AppUser", saved.getId(), saved.getUsername());
        return toResponse(saved);
    }

    @Transactional
    public void resetPassword(Long id) {
        AppUser user = findUser(id);
        user.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
        appUserRepository.save(user);
        auditService.log("USER_PASSWORD_RESET", "AppUser", user.getId(), user.getUsername());
    }

    private void ensureUniqueUser(String username, String employeeCode, Long currentId) {
        String orgCode = currentOrgService.orgCode();
        appUserRepository.findByOrgCodeAndUsernameIgnoreCase(orgCode, username.trim()).ifPresent(existing -> {
            if (!existing.getId().equals(currentId)) {
                throw new BadRequestException("Username already exists");
            }
        });
        appUserRepository.findByOrgCodeAndEmployeeCodeIgnoreCase(orgCode, employeeCode.trim()).ifPresent(existing -> {
            if (!existing.getId().equals(currentId)) {
                throw new BadRequestException("Employee code is already mapped to another user");
            }
        });
    }

    private Employee findEmployee(String employeeCode) {
        return employeeRepository.findByOrgCodeAndEmployeeCodeIgnoreCase(currentOrgService.orgCode(), employeeCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
    }

    private AppUser findUser(Long id) {
        return appUserRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private UserResponse toResponse(AppUser user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmployeeCode(),
                user.getFullName(),
                user.getRole(),
                user.isEnabled(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    private String buildLoginEmail(String username) {
        String value = username.trim().toLowerCase();
        return value.contains("@") ? value : value + "@user.local";
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
