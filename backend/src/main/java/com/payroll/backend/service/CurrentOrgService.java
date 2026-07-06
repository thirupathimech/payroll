package com.payroll.backend.service;

import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.security.UserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentOrgService {

    public String orgCode() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new BadRequestException("Organization context is not available");
        }
        return principal.orgCode();
    }
}
