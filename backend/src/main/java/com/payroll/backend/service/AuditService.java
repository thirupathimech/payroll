package com.payroll.backend.service;

import com.payroll.backend.domain.AuditLog;
import com.payroll.backend.dto.audit.AuditLogResponse;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.repository.AuditLogRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action, String entityName, Object entityId, String details) {
        save(currentOrgCode(), action, entityName, entityId, details);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logForOrg(String orgCode, String action, String entityName, Object entityId, String details) {
        save(orgCode, action, entityName, entityId, details);
    }

    private void save(String orgCode, String action, String entityName, Object entityId, String details) {
        AuditLog auditLog = new AuditLog();
        auditLog.setOrgCode(orgCode);
        auditLog.setActorEmail(currentActorEmail());
        auditLog.setAction(action);
        auditLog.setEntityName(entityName);
        auditLog.setEntityId(entityId == null ? null : String.valueOf(entityId));
        auditLog.setDetails(details);
        auditLogRepository.save(auditLog);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> list(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.from(auditLogRepository.findByOrgCodeOrderByCreatedAtDesc(currentOrgCode(), pageable).map(this::toResponse));
    }

    private String currentActorEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "system";
        }
        return authentication.getName();
    }

    private String currentOrgCode() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            return "SYS";
        }
        return principal.orgCode();
    }

    private AuditLogResponse toResponse(AuditLog auditLog) {
        return new AuditLogResponse(
                auditLog.getId(),
                auditLog.getActorEmail(),
                auditLog.getAction(),
                auditLog.getEntityName(),
                auditLog.getEntityId(),
                auditLog.getDetails(),
                auditLog.getCreatedAt()
        );
    }
}
