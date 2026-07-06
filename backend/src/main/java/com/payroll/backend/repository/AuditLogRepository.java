package com.payroll.backend.repository;

import com.payroll.backend.domain.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByOrgCodeOrderByCreatedAtDesc(String orgCode, Pageable pageable);
}
